package com.fraud.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "known_devices", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "device_key"}))
public class KnownDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "device_key", nullable = false, length = 128)
    private String deviceKey;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "first_seen_at", updatable = false)
    private LocalDateTime firstSeenAt;

    @org.hibernate.annotations.UpdateTimestamp
    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public String getDeviceKey() {
        return deviceKey;
    }

    public void setDeviceKey(String deviceKey) {
        this.deviceKey = deviceKey;
    }
}
