import { DependencyContainer }  from "tsyringe";
import { IPostDBLoadMod }       from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer }       from "@spt-aki/servers/DatabaseServer";
import { ILogger }              from "@spt-aki/models/spt/utils/ILogger";
import { LogTextColor }         from "@spt-aki/models/spt/logging/LogTextColor";
import { IDatabaseTables }      from "@spt-aki/models/spt/server/IDatabaseTables";


class Mod implements IPostDBLoadMod 
{
    //Config file
    private modConfig = require("../config.json");

    //Required files with all the values
    private customs = require("../value_sets/customs.json")
    private presets = require("../value_sets/presets.json")
    private voices = require("../value_sets/voices.json")

    //Make these things class-scope so other functions can access
    private logger:     ILogger;
    private db:         IDatabaseTables;

    public postDBLoad(container: DependencyContainer): void 
    {
        this.logger =           container.resolve<ILogger>("WinstonLogger");
        const databaseServer =  container.resolve<DatabaseServer>("DatabaseServer");

        //Mod Info
        const modFullName =     "Configure AI Voices";
        const debug =           this.modConfig.debug;

        //Get the SPT server database
        this.db = databaseServer.getTables();

        this.logger.info("Loading: " + modFullName);

        for (const easyBotType in this.modConfig.config) //For each bot type we want to change
        {
            //Get the SPT bot type using the "easy" bot type
            const botType: string = this.easyTypesToBotTypes[easyBotType];

            //Get the preset selector and voice selector that the user entered for this bot type
            const presetSelection:  string = this.modConfig.config[easyBotType].frequency;
            const voiceSelection:   string = this.modConfig.config[easyBotType].voice;

            //Initialize value variables
            let currentPreset:  TalkValues;
            let currentVoices:  Array<string>;
            let customValues:   object;

            //Valid Flag
            let validFrequency = true;

            //Get the value set using the given preset selector
            if ( presetSelection === "default" ) //If the user leaves the selector set to default, skip to next bot type.
            {
                if (debug) this.logger.logWithColor("Default frequency detected for AI " + easyBotType + ", skipping.", LogTextColor.GREEN);
                validFrequency = false;
            }
            else if ( ["off", "low", "normal", "high", "custom"].includes(presetSelection) ) //If the user chooses a preset, get it from the presets file
            {
                currentPreset = this.presets[presetSelection];
                this.logger.logWithColor("Preset frequency value set \"" + presetSelection + "\" detected for AI " + easyBotType, LogTextColor.MAGENTA);
            }
            else if ( presetSelection === "fully_custom" ) //If the user chooses to use fully custom value sets by difficulty, get them from the customs file
            {
                customValues = this.customs[easyBotType];
                this.logger.logWithColor("Fully custom frequency value set detected for AI " + easyBotType, LogTextColor.YELLOW);              
            }
            else //If the selector is an invalid string, give error but continue/skip it
            {
                this.logger.error("Incorrect frequency entry \"" + presetSelection + "\" for AI " + easyBotType + ", skipping (default SPT values unchanged).");
                validFrequency = false;
            }

            //Set all frequency values if we have a valid frequency value set
            if ( validFrequency )
            {
                for (const botDifficulty in this.db.bots.types[botType].difficulty) //For each difficulty level of bot type
                {
                    //Behavior category objects that we need
                    const mind = this.db.bots.types[botType].difficulty[botDifficulty].Mind;
                    const patrol = this.db.bots.types[botType].difficulty[botDifficulty].Patrol;
                    const grenade = this.db.bots.types[botType].difficulty[botDifficulty].Grenade;
                    const categories = [mind, patrol, grenade];
    
                    if ( presetSelection === "fully_custom" ) currentPreset = customValues[botDifficulty];
    
                    //Check the object with the current preset values to see if it is valid
                    const isValid = this.checkFrequencyValuesForValidity(currentPreset, easyBotType, botDifficulty);
                    if ( !isValid ) 
                    {
                        this.logger.error("Value set invalid for bot type and difficulty: " + easyBotType + " - " + botDifficulty + ", using SPT defaults instead. See error(s) above.")
                        continue;
                    }
    
                    for ( const category of categories)
                    {
                        for ( const value in this.validTypes )
                        {
                            const cond2 = (category == mind && (value === "CAN_TALK" || value === "TALK_WITH_QUERY"));
                            const cond3 = (category == patrol && value === "CHANCE_TO_PLAY_VOICE_WHEN_CLOSE");
                            if ( typeof(category[value]) != "undefined" || cond2 || cond3 ) 
                            {
                                category[value] = currentPreset[value]
                                if (debug) this.logger.info(botDifficulty + " - " + easyBotType + " - " + value + ": " + category[value]);
                            }
                        }
                    }
                }
            }

            //Get and set the voices array using the given voice selector if custom is chosen, otherwise skip
            if ( presetSelection === "off" )
            {
                this.logger.logWithColor("Note - \"off\" selected for " + easyBotType + " frequency, so the voice selection for this bot will not matter.", LogTextColor.YELLOW);
                this.db.bots.types[botType].appearance.voice = [ "SectantPriest" ];
            }
            else if ( voiceSelection === "default" )
            {
                if (debug) this.logger.logWithColor("Default voices detected for AI " + easyBotType + ", skipping.", LogTextColor.GREEN);
                continue;
            }
            else if ( voiceSelection === "custom" ) //If the user chooses custom voices, get the array from the voices file
            {
                currentVoices = this.voices.bots[easyBotType];
                this.logger.logWithColor("Custom voices value set detected for AI " + easyBotType, LogTextColor.MAGENTA);

                //Check the custom voices array for this bot type
                const isValid = this.checkVoiceValuesForValidity(currentVoices, easyBotType)
                if ( !isValid ) 
                {
                    this.logger.error("Voices array invalid for bot type: " + easyBotType  + ", using SPT defaults instead. See error(s) above.")
                    continue;
                }
                
                //Apply the new voices array and make sure those voices are available to all sides
                this.makeAvailableToAllSides(currentVoices)
                this.db.bots.types[botType].appearance.voice = currentVoices;
            }        
            else //If the selector is an invalid string, give error but continue/skip it
            {
                this.logger.error("Incorrect voices entry \"" + voiceSelection + "\" for AI " + easyBotType + ", skipping (default SPT values unchanged).");
                continue;
            }
        }
    }

    private checkFrequencyValuesForValidity(currentPreset: TalkValues, easyBotType: string, botDifficulty: string): boolean
    {
        let isValid = true;
        
        //Check types
        for ( const value in currentPreset ) //For all of the current preset's values,
        {
            if ( typeof(currentPreset[value]) != this.validTypes[value] ) //Check their types to ensure they are the right type
            {
                this.logger.error("Value " + value + " of " + easyBotType + " - " + botDifficulty + " is a " + typeof(value) + " but is supposed to be a " + this.validTypes[value] + ".");
                isValid = false;
            }
        }

        //Check certain values to make sure they meet conditions specific to them
        //Not really sure what the game actually sees as valid or not but here are some educated guesses
        if ( currentPreset["GROUP_ANY_PHRASE_DELAY"] >= 1000000 || currentPreset["GROUP_ANY_PHRASE_DELAY"] < -1 )
        {
            this.logger.error("Value GROUP_ANY_PHRASE_DELAY of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 1000000.");
            isValid = false;
        }
        if ( currentPreset["GROUP_EXACTLY_PHRASE_DELAY"] >= 1000000 || currentPreset["GROUP_EXACTLY_PHRASE_DELAY"] < -1 )
        {
            this.logger.error("Value GROUP_EXACTLY_PHRASE_DELAY of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 1000000.");
            isValid = false;
        }
        if ( currentPreset["TALK_DELAY"] >= 1000000 || currentPreset["TALK_DELAY"] < -1 )
        {
            this.logger.error("Value TALK_DELAY of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 1000000.");
            isValid = false;
        }
        if ( currentPreset["TALK_DELAY_BIG"] >= 1000000 || currentPreset["TALK_DELAY_BIG"] < -1 )
        {
            this.logger.error("Value TALK_DELAY_BIG of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 1000000.");
            isValid = false;
        }
        if ( currentPreset["MIN_TALK_DELAY"] >= 1000000 || currentPreset["MIN_TALK_DELAY"] < -1 )
        {
            this.logger.error("Value MIN_TALK_DELAY of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 1000000.");
            isValid = false;
        }
        if ( currentPreset["MIN_DIST_TO_CLOSE_TALK"] >= 100 || currentPreset["MIN_DIST_TO_CLOSE_TALK"] < -1 )
        {
            this.logger.error("Value MIN_DIST_TO_CLOSE_TALK of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 100.");
            isValid = false;
        }
        if ( currentPreset["MIN_DIST_TO_CLOSE_TALK_SQR"] >= 10000 || currentPreset["MIN_DIST_TO_CLOSE_TALK_SQR"] < -1 )
        {
            this.logger.error("Value MIN_DIST_TO_CLOSE_TALK_SQR of " + easyBotType + " - " + botDifficulty + " needs to be greater than or equal to -1 and less than 10000.");
            isValid = false;
        }
        if ( currentPreset["MIN_DIST_TO_CLOSE_TALK_SQR"] != (currentPreset["MIN_DIST_TO_CLOSE_TALK"]**2) )
        {
            this.logger.error("Value MIN_DIST_TO_CLOSE_TALK_SQR of " + easyBotType + " - " + botDifficulty + " needs to be MIN_DIST_TO_CLOSE_TALK times itself e.g. 1-1, 2-4, 3-9, 4-16, 5-25, etc.");
            isValid = false;
        }
        /*        
        if ( currentPreset["CHANCE_TO_NOTIFY_ENEMY_GR_100"] > 100 || currentPreset["CHANCE_TO_NOTIFY_ENEMY_GR_100"] < 0 )
        {
            this.logger.error("Value CHANCE_TO_NOTIFY_ENEMY_GR_100 of " + easyBotType + " - " + botDifficulty + " needs to be between 0 and 100.");
            isValid = false;
        }
        */
        if ( currentPreset["CHANCE_TO_PLAY_VOICE_WHEN_CLOSE"] > 100 || currentPreset["CHANCE_TO_PLAY_VOICE_WHEN_CLOSE"] < 0 )
        {
            this.logger.error("Value CHANCE_TO_PLAY_VOICE_WHEN_CLOSE of " + easyBotType + " - " + botDifficulty + " needs to be between 0 and 100.");
            isValid = false;
        }

        return isValid;
    }

    private checkVoiceValuesForValidity(currentVoices: Array<string>, easyBotType: string): boolean
    {
        let isValid = true;

        //Check to make sure they are strings and make sure the string is a valid one
        for ( const value in currentVoices ) //For all of the entries in the voice array,
        {
            if ( typeof(currentVoices[value]) != "string" ) //Check the entry to ensure it is a string
            {
                this.logger.error("Value \"" + currentVoices[value] + "\" of " + easyBotType + " is a " + typeof(value) + " but is supposed to be a string.");
                isValid = false;
            }

            if ( !(this.validVoices.includes(currentVoices[value])) ) //Check to make sure the string is included in the valid options
            {
                this.logger.error("Value \"" + currentVoices[value] + "\" of " + easyBotType + " is not a valid voice!");
                isValid = false;                
            }
        }

        return isValid;
    }

    private makeAvailableToAllSides(currentVoices: Array<string>)
    {
        /* eslint-disable */
        const voiceNamesToIDs = {
            "Bear_1":           "5fc1221a95572123ae7384a2",
            "Bear_1_Eng":       "6284d67f8e4092597733b7a4",
            "Bear_2":           "5fc50bddb4965a7a2f48c5af",
            "Bear_2_Eng":       "6284d6948e4092597733b7a5",
            "Bear_3":           "5fc614da00efd824885865c2",
            "BossBully":        "5fc615460b735e7b024c76eb",
            "BossGluhar":       "5fc6155b0b735e7b024c76ec",
            "BossSanitar":      "5fc615710b735e7b024c76ed",
            "Scav_1":           "5fc613c80b735e7b024c76e2",
            "Scav_2":           "5fc613e10b735e7b024c76e3",
            "Scav_3":           "5fc614130b735e7b024c76e4",
            "Scav_4":           "5fc614290b735e7b024c76e5",
            "Scav_5":           "5fc614390b735e7b024c76e6",
            "Scav_6":           "5fc6144b0b735e7b024c76e7",
            "Usec_1":           "5fc1223595572123ae7384a3",
            "Usec_2":           "5fc614f40b735e7b024c76e9",
            "Usec_3":           "5fc615110b735e7b024c76ea",
            "Usec_4":           "6284d6a28e4092597733b7a6",
            "Usec_5":           "6284d6ab8e4092597733b7a7",
            "BossBigPipe":      "6353fe04f0de2294830a0dbe",
            "BossBirdEye":      "6353fe34f0de2294830a0dbf",
            "BossKilla":        "6353fea0a644ca0c510d1dd8",
            "BossKnight":       "6353fe74a644ca0c510d1dd6",
            "BossTagilla":      "6353fec227f75f803206e60a",
        }
        /* eslint-enable */

        const allSides = [ "Usec", "Bear", "Savage" ]

        for (const voice of currentVoices)
        {
            if ( voice != "SectantPriest" && voice != "SectantWarrior" ) this.db.templates.customization[voiceNamesToIDs[voice]]._props.Side = allSides;
        }
    }

    private easyTypesToBotTypes = {
        "normalScavs":              "assault",
        "sniperScavs":              "marksman",
        "taggedAndCursedScavs":     "cursedassault",
        "bear":                     "bear",
        "usec":                     "usec",
        "reshala":                  "bossbully",
        "reshalaFollowers":         "followerbully",
        "gluhar":                   "bossgluhar",
        "gluharFollowerAssault":    "followergluharassault",
        "gluharFollowerScout":      "followergluharassault",
        "gluharFollowerSecurity":   "followergluharassault",
        "gluharFollowerSnipe":      "followergluharassault",
        "sanitar":                  "bosssanitar",
        "sanitarFollowers":         "followersanitar",
        "shturman":                 "bosskojaniy",
        "shturmanFollowers":        "followerkojaniy",
        "killa":                    "bosskilla",
        "tagilla":                  "bosstagilla",
        "knight":                   "bossknight",
        "bigpipe":                  "followerbigpipe",
        "birdeye":                  "followerbirdeye",
        "santa":                    "gifter",
        "cultistPriest":            "sectantpriest",
        "cultistFollowers":         "sectantwarrior",
        "raiders":                  "pmcbot",
        "rogues":                   "exusec",
        "zryachiy":                 "bosszryachiy",
        "zryachiyFollowers":        "followerzryachiy",
        "arenafighter":             "arenafighter",
        "arenafighterevent":        "arenafighterevent",
        "crazyassault":             "crazyassaultevent"
    }

    /* eslint-disable */
    private validTypes =
    {
        "CAN_TALK":                         "boolean",
        "TALK_WITH_QUERY":                  "boolean",
        "GROUP_ANY_PHRASE_DELAY":           "number",
        "GROUP_EXACTLY_PHRASE_DELAY":       "number",
        "TALK_DELAY":                       "number",
        "TALK_DELAY_BIG":                   "number",
        "MIN_TALK_DELAY":                   "number",
        "MIN_DIST_TO_CLOSE_TALK":           "number",
        "MIN_DIST_TO_CLOSE_TALK_SQR":       "number",
        //"CHANCE_TO_NOTIFY_ENEMY_GR_100":    "number",
        "CHANCE_TO_PLAY_VOICE_WHEN_CLOSE":  "number"
    }

    private validVoices = 
    [
        "Bear_1",
        "Bear_1_Eng",
        "Bear_2",
        "Bear_2_Eng",
        "Bear_3",
        "BossBully",
        "BossGluhar",
        "BossSanitar",
        "Scav_1",
        "Scav_2",
        "Scav_3",
        "Scav_4",
        "Scav_5",
        "Scav_6",
        "Usec_1",
        "Usec_2",
        "Usec_3",
        "Usec_4",
        "Usec_5",
        "BossBigPipe",
        "BossBirdEye",
        "BossKilla",
        "BossKnight",
        "BossTagilla",
        "SectantPriest",
        "SectantWarrior"
    ]
}

type TalkValues = 
{
    CAN_TALK:                           boolean,
    TALK_WITH_QUERY:                    boolean,
    GROUP_ANY_PHRASE_DELAY:             number,
    GROUP_EXACTLY_PHRASE_DELAY:         number,
    TALK_DELAY:                         number,
    TALK_DELAY_BIG:                     number,
    MIN_TALK_DELAY:                     number,
    MIN_DIST_TO_CLOSE_TALK:             number,
    MIN_DIST_TO_CLOSE_TALK_SQR:         number,
    //CHANCE_TO_NOTIFY_ENEMY_GR_100:      number,
    CHANCE_TO_PLAY_VOICE_WHEN_CLOSE:    number
}
/* eslint-enable */

module.exports = { mod: new Mod() }