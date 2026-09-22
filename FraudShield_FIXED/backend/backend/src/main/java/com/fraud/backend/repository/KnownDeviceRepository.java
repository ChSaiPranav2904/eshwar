package com.fraud.backend.repository;

import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.KnownDevice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnownDeviceRepository extends JpaRepository<KnownDevice, Long> {
    Optional<KnownDevice> findByUserAndDeviceKey(AppUser user, String deviceKey);
}
