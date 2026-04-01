package com.callassistant.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "callassistant.ai.openai")
public class OpenAiProperties {

    private String baseUrl;
    private String apiKey;
    private String transcriptionModel;
    private String translationModel;
    private String ttsModel;
    private String copilotPromptId;
    private String copilotPromptVersion = "1";

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getTranscriptionModel() { return transcriptionModel; }
    public void setTranscriptionModel(String transcriptionModel) { this.transcriptionModel = transcriptionModel; }

    public String getTranslationModel() { return translationModel; }
    public void setTranslationModel(String translationModel) { this.translationModel = translationModel; }

    public String getTtsModel() { return ttsModel; }
    public void setTtsModel(String ttsModel) { this.ttsModel = ttsModel; }

    public String getCopilotPromptId() { return copilotPromptId; }
    public void setCopilotPromptId(String copilotPromptId) { this.copilotPromptId = copilotPromptId; }

    public String getCopilotPromptVersion() { return copilotPromptVersion; }
    public void setCopilotPromptVersion(String copilotPromptVersion) { this.copilotPromptVersion = copilotPromptVersion; }
}
