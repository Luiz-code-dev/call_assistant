package com.callassistant.infrastructure.persistence;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Base class for integration tests that connect to the locally-running Docker infra
 * (started via `docker compose up -d postgres redis` in infra/docker).
 * Connection details are configured in application-integration.yml.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration")
public abstract class AbstractIntegrationTest {
}
