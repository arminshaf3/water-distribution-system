package com.water.distribution.repository;

import com.water.distribution.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByCustomerCode(String customerCode);

    Boolean existsByCustomerCode(String customerCode);

    @Query("SELECT c FROM Customer c WHERE " +
           "(:query IS NULL OR :query = '' OR " +
           " LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(c.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " c.phoneNumber LIKE CONCAT('%', :query, '%') OR " +
           " LOWER(c.address) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(c.village.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:villageId IS NULL OR c.village.id = :villageId) " +
           "AND (:status IS NULL OR :status = '' OR c.status = :status)")
    Page<Customer> searchCustomers(
            @Param("query") String query,
            @Param("villageId") Long villageId,
            @Param("status") String status,
            Pageable pageable
    );

    long countByStatus(String status);
}
