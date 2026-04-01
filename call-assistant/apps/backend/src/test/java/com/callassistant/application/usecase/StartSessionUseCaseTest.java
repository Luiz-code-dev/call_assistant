package com.callassistant.application.usecase;

import com.callassistant.application.dto.CreateSessionRequest;
import com.callassistant.application.dto.SessionConfigDto;
import com.callassistant.domain.event.DomainEvent;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.model.SessionStatus;
import com.callassistant.domain.port.outbound.SessionEventPublisher;
import com.callassistant.domain.port.outbound.SessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StartSessionUseCase")
class StartSessionUseCaseTest {

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private SessionEventPublisher eventPublisher;

    @InjectMocks
    private StartSessionUseCaseImpl useCase;

    @Test
    @DisplayName("should create a session with ACTIVE status")
    void shouldCreateActiveSession() {
        when(sessionRepository.save(any(Session.class)))
                .thenAnswer(inv -> Mono.just(inv.getArgument(0)));
        when(eventPublisher.publish(any(DomainEvent.class)))
                .thenReturn(Mono.empty());

        var request = new CreateSessionRequest(
                new SessionConfigDto("en-US", "pt-BR", false, false, null));

        StepVerifier.create(useCase.execute(request))
                .assertNext(response -> {
                    assertThat(response.id()).isNotBlank();
                    assertThat(response.status()).isEqualTo(SessionStatus.ACTIVE.name());
                    assertThat(response.config().sourceLanguage()).isEqualTo("en-US");
                    assertThat(response.config().targetLanguage()).isEqualTo("pt-BR");
                    assertThat(response.startedAt()).isNotNull();
                    assertThat(response.endedAt()).isNull();
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("should reject same source and target language")
    void shouldRejectSameLanguages() {
        var request = new CreateSessionRequest(
                new SessionConfigDto("en-US", "en-US", false, false, null));

        StepVerifier.create(useCase.execute(request))
                .expectErrorMatches(e -> e instanceof IllegalArgumentException
                        && e.getMessage().contains("must differ"))
                .verify();
    }
}
