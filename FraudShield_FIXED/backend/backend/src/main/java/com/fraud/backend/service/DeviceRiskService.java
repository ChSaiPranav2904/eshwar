package com.fraud.backend.service;

import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.KnownDevice;
import com.fraud.backend.repository.KnownDeviceRepository;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DeviceRiskService {

    private final KnownDeviceRepository knownDeviceRepository;

    public DeviceRiskService(KnownDeviceRepository knownDeviceRepository) {
        this.knownDeviceRepository = knownDeviceRepository;
    }

    public Map<String, String> assess(AppUser user, String deviceId) {
        String key = deviceId == null || deviceId.isBlank() ? "MISSING_DEVICE_ID" : deviceId.trim();
        var existing = knownDeviceRepository.findByUserAndDeviceKey(user, key);
        if (existing.isPresent()) {
            knownDeviceRepository.save(existing.get());
            return Map.of("deviceKnown", "YES", "deviceRisk", "LOW", "deviceKey", key);
        }

        KnownDevice device = new KnownDevice();
        device.setUser(user);
        device.setDeviceKey(key);
        knownDeviceRepository.save(device);
        return Map.of("deviceKnown", "NO", "deviceRisk", "HIGH", "deviceKey", key);
    }

    public void trustDevice(AppUser user, String deviceId) {
        String key = deviceId == null || deviceId.isBlank() ? "MISSING_DEVICE_ID" : deviceId.trim();
        var existing = knownDeviceRepository.findByUserAndDeviceKey(user, key);
        if (existing.isPresent()) {
            knownDeviceRepository.save(existing.get());
            return;
        }

        KnownDevice device = new KnownDevice();
        device.setUser(user);
        device.setDeviceKey(key);
        knownDeviceRepository.save(device);
    }
}
