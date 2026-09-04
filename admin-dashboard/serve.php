<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

if (str_contains($path, '/api/')) {
    header('Content-Type: application/json');
    try {
        $pdo = null;
        try {
            $pdo = new PDO("mysql:host=127.0.0.1;port=3307;dbname=water_db;charset=utf8mb4", "root", "");
        } catch (Exception $e) {
            $pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=water_db;charset=utf8mb4", "root", "");
        }
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $method = $_SERVER['REQUEST_METHOD'];
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // ROUTE: Auth Login
        if (preg_match('#/api/v1/auth/login#', $path)) {
            $user = $input['username'] ?? 'admin';
            $role = ($user === 'admin') ? 'ROLE_ADMIN' : 'ROLE_COLLECTOR';
            $jwtToken = 'mock-jwt-token-' . bin2hex(random_bytes(16));
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'id' => ($user === 'admin') ? 1 : 2,
                    'token' => $jwtToken,
                    'accessToken' => $jwtToken,
                    'type' => 'Bearer',
                    'username' => $user,
                    'email' => ($user === 'admin') ? 'admin@waterdist.org' : 'collector1@waterdist.org',
                    'roles' => [$role],
                    'fullName' => ($user === 'admin') ? 'System Administrator' : 'John Collector'
                ]
            ]);
            return;
        }

        // ROUTE: Current User Me
        if (preg_match('#/api/v1/auth/me#', $path)) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'username' => 'admin',
                    'fullName' => 'System Administrator',
                    'roles' => ['ROLE_ADMIN']
                ]
            ]);
            return;
        }

        // ROUTE: Villages
        if (preg_match('#/api/v1/villages#', $path)) {
            if ($method === 'POST') {
                $stmt = $pdo->prepare("INSERT INTO villages (name, code, description, is_active) VALUES (?, ?, ?, TRUE)");
                $stmt->execute([$input['name'] ?? '', $input['code'] ?? '', $input['description'] ?? '']);
                $id = $pdo->lastInsertId();
                echo json_encode(['success' => true, 'data' => ['id' => $id, 'name' => $input['name']]]);
                return;
            }
            $stmt = $pdo->query("SELECT id, name, code, description, is_active AS isActive FROM villages WHERE is_active = TRUE ORDER BY name");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $rows]);
            return;
        }

        // ROUTE: Customer Specific Distributions / Payments (Must be before /customers)
        if (preg_match('#/api/v1/customers/(\d+)/distributions#', $path, $matches)) {
            $custId = $matches[1];
            $stmt = $pdo->prepare("
                SELECT d.id, d.distribution_code AS distributionCode, d.customer_id AS customerId,
                       c.full_name AS customerName, c.customer_code AS customerCode, v.name AS villageName,
                       d.collector_id AS collectorId, u.full_name AS collectorName,
                       d.quantity_litres AS quantityLitres, d.price_per_litre AS pricePerLitre,
                       d.total_amount AS totalAmount, d.distribution_date AS distributionDate,
                       d.payment_status AS paymentStatus, r.receipt_number AS receiptNumber,
                       p.payment_method AS paymentMethod
                FROM water_distributions d
                LEFT JOIN customers c ON d.customer_id = c.id
                LEFT JOIN villages v ON c.village_id = v.id
                LEFT JOIN users u ON d.collector_id = u.id
                LEFT JOIN payments p ON p.distribution_id = d.id
                LEFT JOIN receipts r ON r.payment_id = p.id
                WHERE d.customer_id = ?
                ORDER BY d.id DESC
            ");
            $stmt->execute([$custId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => ['content' => $rows, 'totalElements' => count($rows), 'totalPages' => 1]]);
            return;
        }

        if (preg_match('#/api/v1/customers/(\d+)/payments#', $path, $matches)) {
            $custId = $matches[1];
            $stmt = $pdo->prepare("
                SELECT p.id, p.amount, p.payment_method AS paymentMethod, p.payment_status AS paymentStatus,
                       p.payment_date AS paymentDate, p.reference_number AS referenceNumber,
                       r.receipt_number AS receiptNumber, c.full_name AS customerName, c.customer_code AS customerCode,
                       u.full_name AS collectorName, d.quantity_litres AS quantityLitres
                FROM payments p
                LEFT JOIN receipts r ON r.payment_id = p.id
                LEFT JOIN water_distributions d ON p.distribution_id = d.id
                LEFT JOIN customers c ON d.customer_id = c.id
                LEFT JOIN users u ON p.collector_id = u.id
                WHERE d.customer_id = ?
                ORDER BY p.id DESC
            ");
            $stmt->execute([$custId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => ['content' => $rows, 'totalElements' => count($rows), 'totalPages' => 1]]);
            return;
        }

        // ROUTE: Customers
        if (preg_match('#/api/v1/customers(?:/(\d+))?$#', $path, $matches)) {
            $id = $matches[1] ?? null;
            if ($id && $method === 'GET') {
                $stmt = $pdo->prepare("
                    SELECT c.id, c.customer_code AS customerCode, c.full_name AS fullName, 
                           c.phone_number AS phoneNumber, c.address, c.village_id AS villageId, 
                           v.name AS villageName, c.status, c.last_meter_reading AS lastMeterReading,
                           c.created_at AS createdAt
                    FROM customers c
                    LEFT JOIN villages v ON c.village_id = v.id
                    WHERE c.id = ?
                ");
                $stmt->execute([$id]);
                $cust = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode(['success' => true, 'data' => $cust]);
                return;
            }

            if ($method === 'POST') {
                $count = $pdo->query("SELECT COUNT(*) FROM customers")->fetchColumn() + 1;
                $code = 'CUST-' . str_pad($count, 4, '0', STR_PAD_LEFT);
                $stmt = $pdo->prepare("
                    INSERT INTO customers (customer_code, full_name, phone_number, address, village_id, status, last_meter_reading) 
                    VALUES (?, ?, ?, ?, ?, 'ACTIVE', 120.00)
                ");
                $stmt->execute([$code, $input['fullName'], $input['phoneNumber'], $input['address'], $input['villageId']]);
                echo json_encode(['success' => true, 'message' => 'Customer registered successfully']);
                return;
            }

            $search = $_GET['search'] ?? '';
            $villageFilter = $_GET['villageId'] ?? '';
            $statusFilter = $_GET['status'] ?? '';
            $where = ["1=1"];
            $params = [];

            if (!empty($search)) {
                $where[] = "(c.customer_code LIKE ? OR c.full_name LIKE ? OR c.phone_number LIKE ?)";
                $s = "%$search%";
                $params[] = $s; $params[] = $s; $params[] = $s;
            }
            if (!empty($villageFilter)) {
                $where[] = "c.village_id = ?";
                $params[] = $villageFilter;
            }
            if (!empty($statusFilter)) {
                $where[] = "c.status = ?";
                $params[] = $statusFilter;
            }

            $whereSql = implode(" AND ", $where);
            $stmt = $pdo->prepare("
                SELECT c.id, c.customer_code AS customerCode, c.full_name AS fullName, 
                       c.phone_number AS phoneNumber, c.address, c.village_id AS villageId, 
                       v.name AS villageName, c.status, c.last_meter_reading AS lastMeterReading,
                       c.created_at AS createdAt
                FROM customers c
                LEFT JOIN villages v ON c.village_id = v.id
                WHERE $whereSql
                ORDER BY c.id ASC
            ");
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'content' => $rows,
                    'totalElements' => count($rows),
                    'totalPages' => 1,
                    'size' => count($rows),
                    'number' => 0
                ]
            ]);
            return;
        }

        // ROUTE: Dashboard Admin & Stats
        if (preg_match('#/api/v1/dashboard/(?:admin|stats)#', $path)) {
            $totalRev = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'COMPLETED'")->fetchColumn();
            $totalLitres = $pdo->query("SELECT COALESCE(SUM(quantity_litres), 0) FROM water_distributions")->fetchColumn();
            $totalCust = $pdo->query("SELECT COUNT(*) FROM customers WHERE status = 'ACTIVE'")->fetchColumn();
            $unpaidSum = $pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM water_distributions WHERE payment_status = 'PENDING'")->fetchColumn();
            $pendingCount = $pdo->query("SELECT COUNT(*) FROM water_distributions WHERE payment_status = 'PENDING'")->fetchColumn();
            $activeCollectors = $pdo->query("SELECT COUNT(*) FROM users u JOIN user_roles ur ON ur.user_id = u.id WHERE ur.role_id = 2 AND u.is_active = TRUE")->fetchColumn();
            $activePriceRate = $pdo->query("SELECT price_per_litre FROM water_prices WHERE is_active = TRUE LIMIT 1")->fetchColumn() ?: 5.0;

            $todayRev = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'COMPLETED' AND DATE(payment_date) = CURDATE()")->fetchColumn();
            $todayLitres = $pdo->query("SELECT COALESCE(SUM(quantity_litres), 0) FROM water_distributions WHERE DATE(distribution_date) = CURDATE()")->fetchColumn();

            echo json_encode([
                'success' => true,
                'data' => [
                    'totalCustomers' => (int)$totalCust,
                    'activeCustomers' => (int)$totalCust,
                    'totalRevenue' => (float)$totalRev,
                    'totalLitresDistributed' => (float)$totalLitres,
                    'todaysLitresDistributed' => (float)($todayLitres ?: $totalLitres),
                    'todaysAmountCollected' => (float)($todayRev ?: $totalRev),
                    'monthlyLitresDistributed' => (float)$totalLitres,
                    'monthlyAmountCollected' => (float)$totalRev,
                    'pendingPaymentsAmount' => (float)$unpaidSum,
                    'pendingPaymentsCount' => (int)$pendingCount,
                    'unpaidTotal' => (float)$unpaidSum,
                    'todayCollections' => (float)($todayRev ?: $totalRev),
                    'pendingCollections' => (float)$unpaidSum,
                    'activeCollectorsCount' => (int)$activeCollectors,
                    'currentWaterPricePerLitre' => (float)$activePriceRate,
                    'dailyDistributionTrend' => [
                        ['date' => date('Y-m-d', strtotime('-4 days')), 'value' => 60.0],
                        ['date' => date('Y-m-d', strtotime('-3 days')), 'value' => 40.0],
                        ['date' => date('Y-m-d', strtotime('-2 days')), 'value' => 60.0],
                        ['date' => date('Y-m-d', strtotime('-1 day')), 'value' => 15.0],
                        ['date' => date('Y-m-d'), 'value' => (float)$totalLitres]
                    ],
                    'dailyCollectionTrend' => [
                        ['date' => date('Y-m-d', strtotime('-4 days')), 'value' => 390.0],
                        ['date' => date('Y-m-d', strtotime('-3 days')), 'value' => 200.0],
                        ['date' => date('Y-m-d', strtotime('-2 days')), 'value' => 390.0],
                        ['date' => date('Y-m-d', strtotime('-1 day')), 'value' => 60.0],
                        ['date' => date('Y-m-d'), 'value' => (float)$totalRev]
                    ]
                ]
            ]);
            return;
        }

        // ROUTE: Water Prices History (Must be before generic /water-prices)
        if (preg_match('#/api/v1/water-prices/history#', $path)) {
            $stmt = $pdo->query("SELECT id, price_per_litre AS pricePerLitre, effective_from AS effectiveFrom, is_active AS isActive, notes FROM water_prices ORDER BY id DESC");
            $prices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($prices as &$p) {
                $tiersStmt = $pdo->prepare("SELECT id, tier_name AS tierName, min_litres AS minLitres, max_litres AS maxLitres, price_per_litre AS pricePerLitre FROM water_price_tiers WHERE water_price_id = ?");
                $tiersStmt->execute([$p['id']]);
                $p['tiers'] = $tiersStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            echo json_encode(['success' => true, 'data' => $prices]);
            return;
        }

        // ROUTE: Water Prices (Active / Create)
        if (preg_match('#/api/v1/water-prices(?:/active)?#', $path)) {
            if ($method === 'POST') {
                $rate = (float)($input['pricePerLitre'] ?? 5.0);
                $notes = $input['notes'] ?? 'Updated water rate slabs';
                $pdo->query("UPDATE water_prices SET is_active = FALSE");
                $stmt = $pdo->prepare("INSERT INTO water_prices (price_per_litre, effective_from, is_active, notes, created_by) VALUES (?, NOW(), TRUE, ?, 1)");
                $stmt->execute([$rate, $notes]);
                $newPriceId = $pdo->lastInsertId();

                if (!empty($input['tiers']) && is_array($input['tiers'])) {
                    $tierStmt = $pdo->prepare("INSERT INTO water_price_tiers (water_price_id, tier_name, min_litres, max_litres, price_per_litre) VALUES (?, ?, ?, ?, ?)");
                    foreach ($input['tiers'] as $t) {
                        $tierStmt->execute([$newPriceId, $t['tierName'] ?? 'Slab', (float)($t['minLitres'] ?? 0), isset($t['maxLitres']) ? (float)$t['maxLitres'] : null, (float)($t['pricePerLitre'] ?? $rate)]);
                    }
                }
                echo json_encode(['success' => true, 'message' => 'Water price policy updated successfully', 'data' => ['id' => $newPriceId]]);
                return;
            }

            $priceStmt = $pdo->query("SELECT id, price_per_litre AS pricePerLitre, effective_from AS effectiveFrom, is_active AS isActive, notes FROM water_prices WHERE is_active = TRUE LIMIT 1");
            $price = $priceStmt->fetch(PDO::FETCH_ASSOC);
            if ($price) {
                $tiersStmt = $pdo->prepare("SELECT id, tier_name AS tierName, min_litres AS minLitres, max_litres AS maxLitres, price_per_litre AS pricePerLitre FROM water_price_tiers WHERE water_price_id = ?");
                $tiersStmt->execute([$price['id']]);
                $price['tiers'] = $tiersStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            echo json_encode(['success' => true, 'data' => $price]);
            return;
        }

        // ROUTE: Payments Today (Must be before generic /payments)
        if (preg_match('#/api/v1/payments/today#', $path)) {
            $todaySum = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'COMPLETED' AND DATE(payment_date) = CURDATE()")->fetchColumn();
            $todayCount = $pdo->query("SELECT COUNT(*) FROM payments WHERE payment_status = 'COMPLETED' AND DATE(payment_date) = CURDATE()")->fetchColumn();
            echo json_encode([
                'success' => true,
                'data' => [
                    'totalAmount' => (float)($todaySum ?: 650.0),
                    'totalCount' => (int)($todayCount ?: 3),
                    'collections' => []
                ]
            ]);
            return;
        }

        // ROUTE: Payments (List / Settle)
        if (preg_match('#/api/v1/payments#', $path)) {
            if ($method === 'POST') {
                $distId = $input['distributionId'];
                $amount = $input['amount'];
                $methodType = $input['paymentMethod'] ?? 'CASH';
                $ref = $input['referenceNumber'] ?? ('REF-' . time());

                $pdo->prepare("UPDATE water_distributions SET payment_status = 'PAID' WHERE id = ?")->execute([$distId]);
                $pdo->prepare("INSERT INTO payments (distribution_id, amount, payment_method, payment_status, collector_id, reference_number) VALUES (?, ?, ?, 'COMPLETED', 1, ?)")
                    ->execute([$distId, $amount, $methodType, $ref]);
                $payId = $pdo->lastInsertId();
                $recNo = 'WTR-' . date('Y') . '-' . rand(100000, 999999);
                $pdo->prepare("INSERT INTO receipts (receipt_number, payment_id) VALUES (?, ?)")->execute([$recNo, $payId]);

                echo json_encode(['success' => true, 'message' => 'Payment settled successfully', 'data' => ['receiptNumber' => $recNo]]);
                return;
            }

            $stmt = $pdo->query("
                SELECT p.id, p.amount, p.payment_method AS paymentMethod, p.payment_status AS paymentStatus,
                       p.payment_date AS paymentDate, p.reference_number AS referenceNumber,
                       r.receipt_number AS receiptNumber, c.full_name AS customerName, c.customer_code AS customerCode,
                       u.full_name AS collectorName, d.quantity_litres AS quantityLitres
                FROM payments p
                LEFT JOIN receipts r ON r.payment_id = p.id
                LEFT JOIN water_distributions d ON p.distribution_id = d.id
                LEFT JOIN customers c ON d.customer_id = c.id
                LEFT JOIN users u ON p.collector_id = u.id
                ORDER BY p.id DESC
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([
                'success' => true,
                'data' => [
                    'content' => $rows,
                    'totalElements' => count($rows),
                    'totalPages' => 1,
                    'pageNo' => 0,
                    'pageSize' => count($rows)
                ]
            ]);
            return;
        }

        // ROUTE: Reports Export CSV
        if (preg_match('#/api/v1/reports/export/csv#', $path)) {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename=water_distribution_report_' . date('Y-m-d') . '.csv');
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Distribution Code', 'Customer Code', 'Customer Name', 'Village', 'Collector', 'Litres', 'Rate (Rs/L)', 'Total Amount (Rs)', 'Status', 'Date']);
            $stmt = $pdo->query("
                SELECT d.distribution_code, c.customer_code, c.full_name, v.name, u.full_name AS collector, d.quantity_litres, d.price_per_litre, d.total_amount, d.payment_status, d.distribution_date
                FROM water_distributions d
                LEFT JOIN customers c ON d.customer_id = c.id
                LEFT JOIN villages v ON c.village_id = v.id
                LEFT JOIN users u ON d.collector_id = u.id
                ORDER BY d.id DESC
            ");
            while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                fputcsv($out, $row);
            }
            fclose($out);
            return;
        }

        // ROUTE: Collectors
        if (preg_match('#/api/v1/(?:auth/)?collectors#', $path)) {
            if ($method === 'POST') {
                $pwdHash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xA0vZ1erc9gW2ES6';
                $stmt = $pdo->prepare("INSERT INTO users (username, email, password, full_name, phone_number, is_active) VALUES (?, ?, ?, ?, ?, TRUE)");
                $stmt->execute([$input['username'] ?? '', $input['email'] ?? '', $pwdHash, $input['fullName'] ?? '', $input['phoneNumber'] ?? '']);
                $newId = $pdo->lastInsertId();
                $pdo->prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, 2)")->execute([$newId]);
                echo json_encode(['success' => true, 'message' => 'Collector registered successfully', 'data' => ['id' => $newId, 'username' => $input['username']]]);
                return;
            }

            $stmt = $pdo->query("
                SELECT u.id, u.username, u.email, u.full_name AS fullName, u.phone_number AS phoneNumber, u.is_active AS isActive
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'ROLE_COLLECTOR'
                ORDER BY u.id ASC
            ");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $rows]);
            return;
        }

        // ROUTE: Reports Summary
        if (preg_match('#/api/v1/reports(?:/summary)?#', $path)) {
            $totalRev = (float)$pdo->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'COMPLETED'")->fetchColumn();
            $totalLitres = (float)$pdo->query("SELECT COALESCE(SUM(quantity_litres), 0) FROM water_distributions")->fetchColumn();
            $unpaidSum = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM water_distributions WHERE payment_status = 'PENDING'")->fetchColumn();
            $totalDist = (int)$pdo->query("SELECT COUNT(*) FROM water_distributions")->fetchColumn();

            $vBreakdown = $pdo->query("
                SELECT v.name AS name, COALESCE(SUM(d.total_amount), 0) AS totalAmount, COALESCE(SUM(d.quantity_litres), 0) AS totalLitres
                FROM villages v
                LEFT JOIN customers c ON c.village_id = v.id
                LEFT JOIN water_distributions d ON d.customer_id = c.id
                GROUP BY v.id, v.name
            ")->fetchAll(PDO::FETCH_ASSOC);

            $cBreakdown = $pdo->query("
                SELECT u.full_name AS collectorName, COALESCE(SUM(p.amount), 0) AS totalCollected, COUNT(p.id) AS totalPayments
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN payments p ON p.collector_id = u.id AND p.payment_status = 'COMPLETED'
                WHERE ur.role_id = 2
                GROUP BY u.id, u.full_name
            ")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'totalAmount' => $totalRev + $unpaidSum,
                    'paidAmount' => $totalRev,
                    'pendingAmount' => $unpaidSum,
                    'totalTransactions' => $totalDist,
                    'totalLitres' => $totalLitres,
                    'collectionRate' => ($totalRev + $unpaidSum > 0) ? round(($totalRev / ($totalRev + $unpaidSum)) * 100, 1) : 100.0,
                    'customerBreakdown' => [],
                    'collectorBreakdown' => $cBreakdown,
                    'villageBreakdown' => $vBreakdown
                ]
            ]);
            return;
        }

    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        return;
    }
}

// Static HTML fallback
$relativePath = urldecode($path === '/' ? '/index.html' : $path);
$file = realpath(__DIR__ . '/dist' . $relativePath);
$distRoot = realpath(__DIR__ . '/dist');

if ($file !== false && str_starts_with($file, $distRoot) && is_file($file)) {
    return false;
}

if (file_exists(__DIR__ . '/dist/index.html')) {
    readfile(__DIR__ . '/dist/index.html');
} else {
    echo "Water Distribution System Admin Server Ready.";
}
