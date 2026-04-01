package com.callassistant.infrastructure.adapter.outbound.persistence.repository;

import com.callassistant.infrastructure.adapter.outbound.persistence.entity.SessionEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

public interface SessionR2dbcRepository extends ReactiveCrudRepository<SessionEntity, String> {}
