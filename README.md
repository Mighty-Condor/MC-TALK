MC-TALK - Configure AI Voices

A mod that allows you to choose how talkative you want SPT bots to be by bot type or even by difficulty of bot type, as well as assign different bot voices to different bots.


This README file should contain everything you need to know in order to configure all the available values related to voiceline rates and voices. That being said, however, no one is completely sure what exactly all of the values do so it might require some experimentation.

**IMPORTANT NOTE**: The presets of this mod were created with PMCs in mind and may not have the desired effect on other bot types. If you need to fine tune, I suggest you look into the custom and fully_custom options below.


Config:

Contained in the config.json under the "config" section is a list of AI bot types and their currently selected keywords for frequency and voice.

> Change the "frequency" value (right side) for whichever AI bot types you want to change to one of the valid options below to change them from their default SPT behavior.

**Choosing one of the included keywords below other than "default" will apply that keyword's value set to all difficulties of a bot type.
**You can choose "fully_custom" to edit the value sets by bot difficulty level in customs.json.

> Change the "voice" value (right side) to "custom" to use the array of voices in voices.json for that bot type. By default these voice arrays contain the default SPT voices.
    - Make sure you follow the proper formatting for the json to not encounter any errors!

Watch for errors in the server window, which will show up in red. Magenta and yellow text will tell you if a preset or custom change is applied.

Debug: Change "debug" in config.json from false to true if you want to see all of the values and make sure they are being changed.


Included files:

    config.json         - Main config file, change the "frequency" and "voice" values in "config" to one of the value set keywords to select which value set you want to use for that AI.
    presets.json        - File containing some preset value sets, as well as a custom preset if you want to apply a custom value set across all a bot type's difficulties.
    customs.json        - File containing all of the value sets separated by difficulty if you want full control over all the values by difficulty. Enabled with "fully_custom" keyword.
    voices.json         - File containing the arrays where you can change what bots have what voices. 
    defaults_X.X.X.json - File containing SPT's talk frequency values for reference by SPT version. I highly suggest you do not change these files, they are there as a reference point for you.
    default_voices.json - File containing SPT's voice arrays for reference. I highly suggest you do not change this file to preserve a reference in case you need to change something back.


Valid keywords for "frequency":

    "default"               - Use SPT's default values/don't change anything for that bot type
    "off"                   - A set that should make bots say nothing at all.
    "low"                   - Talks occasionally
    "normal"                - Baseline talkative levels I chose for this mod
    "high"                  - Very talkative (as talkative as scavs are normally)
    "custom"                - Apply a custom set of values across all difficulties of the bot type (Uses presets.json "custom" field)
    "fully_custom           - Apply a custom set of values to each difficulty of a bot type (Uses customs.json for that bot type)


Valid keywords for "voice":

    "default"               - Use SPT's default voices/don't change anything for that bot type
    "custom"                - Apply a custom selection of voices to a bot type. Use any of the valid voices in voices.json to change the given arrays (but keep the right formatting!).


Description of values:

    **Important Note**: These are all educated guesses, some with more certainty than others.


    "CAN_TALK" (true/false)

    Enables (true) or disables (false) the AI's ability to say voicelines.

    BSG Description: "can we speak"


    "TALK_WITH_QUERY" (true/false)
    
    Unknown, though it seems that bots all have it set to true by default except for Shturman, his guards, and Birdeye, so I suspect setting this to false makes them quieter in some way but not really sure how exactly.

    BSG Description: "Bot speaks only through phrase queue and priority"


    "GROUP_ANY_PHRASE_DELAY" (-1 to 999999.1)
    
    Has something to do with the time delay between voicelines in a group of AI, probably in seconds.

    BSG Description: "After the bot says the phrase, the next bot from the same group will be able to say the phrase only through X. If X<0 then there is no delay."


    "GROUP_EXACTLY_PHRASE_DELAY" (-1 to 999999.1)
    
    Also has something to do with the time delay between voicelines in a group of AI, probably in seconds.

    BSG Description: "Same as GROUP_ANY_PHRASE_DELAY only applies to a specific phrase type"


    "TALK_DELAY" (-1 to 999999.1)
    
    Unknown, lower = more talkative, probably in seconds or milliseconds.

    BSG Description: "Delta phrases in conversation"


    "TALK_DELAY_BIG" (-1 to 999999.1)
    
    Unknown, lower = more talkative, probably in seconds or milliseconds.

    BSG Description: "If there are no friends, then we will talk with such a delta"


    "MIN_TALK_DELAY" (-1 to 999999.1)
    
    Unknown, lower = more talkative, probably in seconds or milliseconds.

    BSG Description: "Delta on talkativeness"


    "MIN_DIST_TO_CLOSE_TALK" (-1 to 100)
    
    Unknown, but I suspect this is a value in meters that gives a radius that AI will talk when you are inside of that radius to alert you to their presence. This is a complete guess, however.

    BSG Description: None :-(


    "MIN_DIST_TO_CLOSE_TALK_SQR" (-1 to 10000)
    
    This should always be "MIN_DIST_TO_CLOSE_TALK" squared (times itself e.g. 5^2 = 25, 6^2 = 36, 7^2 = 49, etc.).

    BSG Description: None :-(


    "CHANCE_TO_NOTIFY_ENEMY_GR_100" (0 to 100)
    
    Chance of doing a voiceline when a hostile grenade is thrown at them.

    BSG Description: "Chance to see a grenade flying at the bot"


    "CHANCE_TO_PLAY_VOICE_WHEN_CLOSE" (0 to 100)

    Probably the chance of a bot saying a voiceline when you are in close proximity to it, might only work for friendlies, not sure.

    BSG Description: "chance to say phrase during greeting"