var fs = require("fs");
var path = require("path");

const SRC_ROOT_FOLDER = "path_of_src_folder";
const LOCALES_FOLDER = "paths_of_locales_folder";

const mightHaveTranslationKeysPredicate = (file) =>
  (file.includes(".tsx") || file.includes(".ts")) &&
  !file.includes(".spec") &&
  !file.includes(".stories");
const localesFilePredicate = (file) => !file.includes("timezones.json") && !file.includes("edges.json");

/**
 * Asynchronous function retrieving the name of each files
 * within a directory, matching a given predicate, recursively.
 *
 * @param {*} dir
 * @param {*} predicate
 * @param {*} done
 */
const listFilesInDirectory = function (dir, predicate, done) {
  var results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    var i = 0;

    (function next() {
      var file = list[i++];

      if (!file) return done(null, results);

      file = path.resolve(dir, file);

      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          listFilesInDirectory(file, predicate, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else if (predicate(file)) {
          results.push(file);
          next();
        } else {
          next();
        }
      });
    })();
  });
};

/**
 * Extract translation keys from the given file.
 * Remove the "domain" if needed. For instance global:done is converted to done.
 * @param {*} files
 * @returns
 */
const extractKeysUsedInProject = (files) => {
  let keys = [];

  for (let i = 0; i < files.length; i++) {
    const keysFormat = ["{t('", "messageI18n: '", "i18n.t('", "i18nKey = '", "i18nKey: '", "headingI18n: '", "tooltipValue: '"]

    const allFileContents = fs.readFileSync(files[i], "utf-8");

    allFileContents.split(/\r?\n/).forEach((line) => {
      keysFormat.forEach(keyFormat => {
        if (line.includes(keyFormat)) {
          let substring = line.substring(line.indexOf(keyFormat)).substring(keyFormat.length);
          substring = substring.substring(0, substring.indexOf(`'`));
          keys.push(substring);
        }
      })

      // specific if statement to find nested keys
      if (line.includes(" t('")) {
        let substring = line.substring(line.indexOf(" t('")).substring(4);
        const indexEndOfKey = substring.indexOf(`'`);
        const firstOccurrence = substring.substring(0, indexEndOfKey)
        keys.push(firstOccurrence);

        // we do it once again as there might be multiple occurrences of translation keys
        const lastPartOfString = substring.substring(indexEndOfKey, substring.length);
        if (lastPartOfString.includes(" t('")) {
          let substring = line.substring(line.indexOf(" t('")).substring(4);
          substring = substring.substring(0, substring.indexOf(`'`));
          keys.push(substring);
        }
      }
    });
  }

  // clean domain
  keys = keys.map((key) => {
    if (key.indexOf(":") > -1) {
      return key.substring(key.indexOf(":") + 1);
    }
    return key;
  });

  // remove empty keys
  keys = keys.filter(key => key.length > 0);

  return keys;
};

/**
 * Extract all keys from locales files.
 *
 * @param {*} files
 * @returns
 */
const extractKeysFromLocalesFiles = (files) => {
  let localesEntries = {};

  files.forEach((file) => {
    const localeFileContent = fs.readFileSync(file, "utf-8");
    let jsonContent = JSON.parse(localeFileContent);

    // for each entry, get the nested keys
    Object.keys(jsonContent).forEach((entry) => {
      localesEntries = { ...localesEntries, ...jsonContent[entry] };
    });
  });


  // remove plurals
  localesEntries = Object.keys(localesEntries).filter(key => !key.includes("_plural"));

  // remove dynamical built translations for now
  localesEntries = localesEntries.filter(key => !DYNAMICALLY_BUILT_TRANSLATIONS.includes(key));

  return localesEntries;
};

/**
 * Display stats
 * @param {*} componentKeys
 * @param {*} localesKeys
 */
const computeStats = (componentKeys, localesKeys) => {
  // find missing used keys
  const keysNotFound = componentKeys.filter((k) => !localesKeys.includes(k));
  const uselessTranslatedKeys = localesKeys.filter((k) => !componentKeys.includes(k));

  console.log(`Found ${componentKeys.length} keys used in the project`);
  console.log(`Found ${localesKeys.length} keys translated`);
  console.log(`Found ${keysNotFound.length} keys without translations`);
  console.log(`Found ${uselessTranslatedKeys.length} useless translations`);
  console.log(keysNotFound);
};

// 1- list files which might use translation keys (components, notifications, etc...)
listFilesInDirectory(
  SRC_ROOT_FOLDER,
  mightHaveTranslationKeysPredicate,
  function (err, componentFiles) {
    if (err) throw err;

    // 2- extract those keys
    let componentKeys = extractKeysUsedInProject(componentFiles);

    // 3- list all locales files (en only)
    listFilesInDirectory(
      LOCALES_FOLDER,
      localesFilePredicate,
      function (err, localesFiles) {
        // 4- extract keys from those locales files
        const localesKeys = extractKeysFromLocalesFiles(localesFiles);

        // 5- display results
        computeStats(componentKeys, localesKeys);
      }
    );
  }
);


const DYNAMICALLY_BUILT_TRANSLATIONS = [
  "AbandonedInClassic",
  "AbandonedInIVR",
  "AgentsDidNotAnswer",
  "CalledOnSubtitle",
  "MarkDone",
  "MarkToDo",
  "NoAvailableAgent",
  "OutOfOpeningHours",
  "ShortAbandoned",
  "UnknownReason",
  "RatingAudioCuts",
  "RatingAudioLag",
  "RatingAudioOneWay",
  "RatingCallDropped",
  "RatingListenEcho",
  "RatingListenNoises",
  "Filters",
  "Notes_plural",
  "Tags_plural",
  "MessageStatus",
  "ErrorMessage",
  "ContactsImportPartialProcessing_plural",
  "ContactsImportPartialProcessing_plural_plural",
  "SmsNotCapableTooltipEmergencyCall",
  "SmsNotCapableTooltipFromTheCountry",
  "SmsNotCapableTooltipSelectedCountry",
  "DayOfMonthFormat",
  "DayOfYearFormat",
  "Unavailable",
  "CallQualityDisconnected",
  "CallQualityExcellent",
  "CallQualityGood",
  "CallQualityIssues",
  "CallQualityLow",
  "CallQualityUnknown",
  "CallQualityVeryLow",
  "CoachingConnecting",
  "CoachingErrorAlreadyCoached",
  "CoachingErrorCallEnded",
  "CoachingErrorUnknown",
  "CoachingLeft",
  "CoachingWhisperStart",
  "CoachingWhisperStop",
  "Held",
  "Hold",
  "Label",
  "Mute",
  "Muted",
  "NetworkTypeEthernet",
  "NetworkTypeWifi",
  "ParticipantsCount_plural",
  "PauseRec",
  "de-DE",
  "en-US",
  "es-ES",
  "fr-FR",
  "it-IT",
  "nb-NO",
  "TagsEmptyStateSecondary",
  "TagsEmptyStateSubtitleSecondary",
  "ActionsEnable",
  "ActionsReload",
  "ActionsSeeMore",
  "ActionsUndo",
  "LanguageSelected",
  "LanguageSelected",
  "Next",
  "OnboardingSlide-1",
  "OnboardingSlide-2",
  "OnboardingSlide-3",
  "OnboardingSlide-4",
  "BrowserButton",
  "BrowserHeading",
  "BrowserParagraph",
  "BrowserTitle",
  "DownloadCta",
  "UpdateCta",
  "RequirementCharacters_plural",
  "RequirementLowercase_plural",
  "RequirementNumbers_plural",
  "RequirementSpecialCharacters_plural",
  "RequirementUppercase_plural",
  "FileImportMessage",
  "PhoneNumberPlaceholder",
  "SearchAvailableTeammatesLabel",
  "FollowUpTooltipAdd",
  "FollowUpTooltipRemove",
  "PanelTitle_plural",
  "SwitchTooltipOff",
  "SwitchTooltipOn",
  "ActivitySummaryDaily",
  "ActivitySummaryMonthly",
  "ActivitySummaryNever",
  "ActivitySummaryWeekly",
  "CancelNetworkDiagnosticTitle",
  "EditTimeSlotTitle",
  "HighQuality",
  "LowQuality",
  "MedQuality",
  "ReRunNetworkDiagnosticTitle",
  "RunNetworkDiagnosticTitle",
  "SpeakersDefaultDevice",
  "ArchiveAllDialogDisplayableMessage_plural",
  "ArchiveAllDialogMessage",
  "ArchiveAllDialogMessage_plural",
  "ArchiveSheetTitle_plural",
  "CallbackRequest_plural",
  "FilterNumbers_plural",
  "FilterRetry",
  "MultiSelectDeselectAll",
  "MultiSelectSelectAll",
];
