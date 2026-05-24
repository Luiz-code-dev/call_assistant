const { withAndroidManifest } = require("expo/config-plugins");

const AUDIO_SERVICES = [
  "expo.modules.audio.service.AudioControlsService",
  "expo.modules.audio.service.AudioRecordingService",
];

module.exports = function withAudioForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application?.service) return config;

    application.service = application.service.map((service) => {
      const name = service.$?.["android:name"];
      if (AUDIO_SERVICES.includes(name)) {
        service.$ = {
          ...service.$,
          "android:foregroundServiceType": "microphone",
        };
      }
      return service;
    });

    return config;
  });
};
