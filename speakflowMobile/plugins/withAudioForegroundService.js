const { withAndroidManifest } = require("expo/config-plugins");

// Both audio services use "microphone" type:
// - AudioRecordingService: captures mic input for Live Assist
// - AudioControlsService: manages the recording session notification/controls
// The app does NOT play back media, so mediaPlayback type is not needed.
const SERVICE_TYPES = {
  "expo.modules.audio.service.AudioRecordingService": "microphone",
  "expo.modules.audio.service.AudioControlsService": "microphone",
};

module.exports = function withAudioForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application?.service) return config;

    application.service = application.service.map((service) => {
      const name = service.$?.["android:name"];
      const type = SERVICE_TYPES[name];
      if (type) {
        service.$ = {
          ...service.$,
          "android:foregroundServiceType": type,
        };
      }
      return service;
    });

    return config;
  });
};
