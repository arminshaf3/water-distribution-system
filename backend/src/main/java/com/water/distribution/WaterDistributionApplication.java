package com.water.distribution;

import com.water.distribution.entity.*;
import com.water.distribution.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@SpringBootApplication
@EnableJpaAuditing
public class WaterDistributionApplication {

    public static void main(String[] args) {
        SpringApplication.run(WaterDistributionApplication.class, args);
    }

    @Bean
    public CommandLineRunner initSeedData(
            UserRepository userRepository,
            RoleRepository roleRepository,
            VillageAreaRepository villageRepository,
            WaterPriceRepository priceRepository,
            CustomerRepository customerRepository,
            WaterDistributionRepository distributionRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. Ensure Roles
            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseGet(() -> roleRepository.save(new Role(null, "ROLE_ADMIN")));
            Role collectorRole = roleRepository.findByName("ROLE_COLLECTOR")
                    .orElseGet(() -> roleRepository.save(new Role(null, "ROLE_COLLECTOR")));

            // 2. Ensure Admin User (admin / admin123)
            userRepository.findByUsername("admin").ifPresentOrElse(
                    admin -> {
                        admin.setPassword(passwordEncoder.encode("admin123"));
                        admin.setIsActive(true);
                        userRepository.save(admin);
                    },
                    () -> {
                        Set<Role> roles = new HashSet<>();
                        roles.add(adminRole);
                        User admin = User.builder()
                                .username("admin")
                                .email("admin@waterdist.org")
                                .password(passwordEncoder.encode("admin123"))
                                .fullName("System Administrator")
                                .phoneNumber("+94770000000")
                                .isActive(true)
                                .roles(roles)
                                .build();
                        userRepository.save(admin);
                    }
            );

            // 3. Ensure Collector User (collector1 / collector123)
            userRepository.findByUsername("collector1").ifPresentOrElse(
                    collector -> {
                        collector.setPassword(passwordEncoder.encode("collector123"));
                        collector.setIsActive(true);
                        userRepository.save(collector);
                    },
                    () -> {
                        Set<Role> roles = new HashSet<>();
                        roles.add(collectorRole);
                        User collector = User.builder()
                                .username("collector1")
                                .email("collector1@waterdist.org")
                                .password(passwordEncoder.encode("collector123"))
                                .fullName("John Collector")
                                .phoneNumber("+94771112233")
                                .isActive(true)
                                .roles(roles)
                                .build();
                        userRepository.save(collector);
                    }
            );

            // 4. Ensure Default Village Sector
            if (villageRepository.count() == 0) {
                VillageArea village = VillageArea.builder()
                        .name("Green Valley Central")
                        .code("VIL-GVC")
                        .description("Main distribution sector in central district")
                        .isActive(true)
                        .build();
                villageRepository.save(village);
            }

            // 5. Ensure Initial Active Water Price & Slabs
            WaterPrice activePrice = priceRepository.findAll().stream().findFirst().orElse(null);
            if (activePrice == null) {
                User admin = userRepository.findByUsername("admin").orElse(null);
                activePrice = WaterPrice.builder()
                        .pricePerLitre(new BigDecimal("5.00"))
                        .effectiveFrom(LocalDateTime.now())
                        .isActive(true)
                        .notes("Initial standard water rate and slabs")
                        .createdBy(admin)
                        .build();
                activePrice = priceRepository.save(activePrice);
            }

            if (activePrice.getTiers() == null || activePrice.getTiers().isEmpty()) {
                com.water.distribution.entity.WaterPriceTier t1 = com.water.distribution.entity.WaterPriceTier.builder()
                        .waterPrice(activePrice)
                        .tierName("Tier 1 - Essential (0-20L)")
                        .minLitres(new BigDecimal("0"))
                        .maxLitres(new BigDecimal("20"))
                        .pricePerLitre(new BigDecimal("4.00"))
                        .build();

                com.water.distribution.entity.WaterPriceTier t2 = com.water.distribution.entity.WaterPriceTier.builder()
                        .waterPrice(activePrice)
                        .tierName("Tier 2 - Standard (21-50L)")
                        .minLitres(new BigDecimal("21"))
                        .maxLitres(new BigDecimal("50"))
                        .pricePerLitre(new BigDecimal("5.00"))
                        .build();

                com.water.distribution.entity.WaterPriceTier t3 = com.water.distribution.entity.WaterPriceTier.builder()
                        .waterPrice(activePrice)
                        .tierName("Tier 3 - High Use (51+L)")
                        .minLitres(new BigDecimal("51"))
                        .maxLitres(null)
                        .pricePerLitre(new BigDecimal("6.50"))
                        .build();

                activePrice.getTiers().add(t1);
                activePrice.getTiers().add(t2);
                activePrice.getTiers().add(t3);

                priceRepository.save(activePrice);
            }

            // 6. Seed Sample Customers for Immediate Testing
            if (customerRepository.count() == 0) {
                VillageArea village = villageRepository.findAll().stream().findFirst().orElse(null);
                if (village != null) {
                    customerRepository.save(Customer.builder()
                            .customerCode("CUST-GVC-0001")
                            .fullName("Robert Smith")
                            .phoneNumber("+94771234567")
                            .address("45 Water Tank Road, Sector 3")
                            .village(village)
                            .status("ACTIVE")
                            .build());

                    customerRepository.save(Customer.builder()
                            .customerCode("CUST-GVC-0002")
                            .fullName("Sarah Jenkins")
                            .phoneNumber("+94772345678")
                            .address("12 Palm Grove, Main Street")
                            .village(village)
                            .status("ACTIVE")
                            .build());

                    customerRepository.save(Customer.builder()
                            .customerCode("CUST-GVC-0003")
                            .fullName("Michael Brown")
                            .phoneNumber("+94773456789")
                            .address("88 Lakeview Avenue")
                            .village(village)
                            .status("ACTIVE")
                            .build());

                    customerRepository.save(Customer.builder()
                            .customerCode("CUST-GVC-0004")
                            .fullName("Emily Davis")
                            .phoneNumber("+94774567890")
                            .address("204 Hilltop Lane")
                            .village(village)
                            .status("ACTIVE")
                            .build());

                    customerRepository.save(Customer.builder()
                            .customerCode("CUST-GVC-0005")
                            .fullName("David Wilson")
                            .phoneNumber("+94775678901")
                            .address("17 Sunshine Boulevard")
                            .village(village)
                            .status("ACTIVE")
                            .build());
                }
            }

            // 7. Seed Sample Water Distributions (Unpaid & Paid) for Immediate Sync Testing
            if (distributionRepository.count() == 0) {
                User collector = userRepository.findByUsername("collector1").orElse(null);
                Customer customer1 = customerRepository.findByCustomerCode("CUST-GVC-0001").orElse(null);
                Customer customer5 = customerRepository.findByCustomerCode("CUST-GVC-0005").orElse(null);

                if (collector != null && customer1 != null) {
                    WaterDistribution d1 = WaterDistribution.builder()
                            .distributionCode("DIST-10001")
                            .customer(customer1)
                            .collector(collector)
                            .quantityLitres(new BigDecimal("60.00"))
                            .pricePerLitre(new BigDecimal("6.50"))
                            .totalAmount(new BigDecimal("390.00"))
                            .distributionDate(LocalDateTime.now().minusHours(2))
                            .paymentStatus("PENDING")
                            .build();
                    distributionRepository.save(d1);
                }

                if (collector != null && customer5 != null) {
                    WaterDistribution d5 = WaterDistribution.builder()
                            .distributionCode("DIST-10005")
                            .customer(customer5)
                            .collector(collector)
                            .quantityLitres(new BigDecimal("40.00"))
                            .pricePerLitre(new BigDecimal("5.00"))
                            .totalAmount(new BigDecimal("200.00"))
                            .distributionDate(LocalDateTime.now().minusHours(1))
                            .paymentStatus("PENDING")
                            .build();
                    distributionRepository.save(d5);
                }
            }
        };
    }
}
