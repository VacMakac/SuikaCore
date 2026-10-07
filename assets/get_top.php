<?php
$db = new mysqli("localhost", "a1239072_adminka", "xJ2nK2yF3a", "a1239072_core-video");
$db->set_charset("utf8mb4");

function getTop($db, $interval) {
    $query = "
        SELECT nickname, MAX(score) as best_score
        FROM scores
        WHERE created_at >= NOW() - INTERVAL $interval
        GROUP BY nickname
        ORDER BY best_score DESC
        LIMIT 10
    ";
    return $db->query($query)->fetch_all(MYSQLI_ASSOC);
}

$result = [
    "day" => getTop($db, "1 DAY"),
    "week" => getTop($db, "1 WEEK"),
    "month" => getTop($db, "1 MONTH"),
];

header('Content-Type: application/json');
echo json_encode($result);
?>
