<?php
include 'connect.php';

// Fix 1: Select all required columns for the chart loop
$stmt = $db_pdo->query('SELECT `Tme`, `current_participants` FROM halloween_event_participants');
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Fix 2: Use fetch() instead of fetchAll() since LIMIT 1 returns only one row
$latest_stmt = $db_pdo->query('SELECT `Tme`, `current_participants`, `total_participants` FROM halloween_event_participants ORDER BY `Tme` DESC LIMIT 1');
$latest_data = $latest_stmt->fetch(PDO::FETCH_ASSOC);

// Fix 3: Safely assign values from the single row array
if ($latest_data) {
    $Total = $latest_data['total_participants'];
    $Current = $latest_data['current_participants'];
} else {
    $Total = 0;
    $Current = 0;
}

$labels = [];
$values = [];

foreach ($data as $row) {
    $labels[] = $row['Tme'];
    $values[] = (int) $row['current_participants'];
}
?>

<script>
    // Fix 4: Corrected PHP tags and echo syntax for JavaScript assignment
    document.getElementById('currentParticipants').innerText = <?php echo json_encode($Current); ?>;
    document.getElementById('totalParticipants').innerText = <?php echo json_encode($Total); ?>;
</script>

<script>
    // Pass PHP arrays into JavaScript using json_encode
    const chartLabels = <?php echo json_encode($labels); ?>;
    const chartData = <?php echo json_encode($values); ?>;
    // Render Chart.js Line Chart
    const ctx = document.getElementById('peopleCountChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Participant',
                data: chartData,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
</script>