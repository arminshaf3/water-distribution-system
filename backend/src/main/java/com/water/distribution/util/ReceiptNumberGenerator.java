package com.water.distribution.util;

import java.time.Year;
import java.util.concurrent.atomic.AtomicLong;

public class ReceiptNumberGenerator {

    private static final AtomicLong SEQUENCE = new AtomicLong(System.currentTimeMillis() % 1000000);

    public static String generateReceiptNumber() {
        int currentYear = Year.now().getValue();
        long seq = Math.abs(SEQUENCE.incrementAndGet() % 1000000);
        return String.format("WTR-%d-%06d", currentYear, seq);
    }

    public static String generateReceiptNumber(Long paymentId) {
        if (paymentId == null) {
            return generateReceiptNumber();
        }
        int currentYear = Year.now().getValue();
        return String.format("WTR-%d-%06d", currentYear, paymentId);
    }

    public static String generateDistributionCode() {
        return "DIST-" + System.currentTimeMillis();
    }

    public static String generateCustomerCode() {
        return "CUST-" + (100000 + (int)(Math.random() * 899999));
    }
}
