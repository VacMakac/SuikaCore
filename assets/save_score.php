<?php
$bad_words = file('blacklist.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

function contains_bad_word($text, $bad_words) {
    $text_lower = mb_strtolower($text, 'UTF-8');
    foreach ($bad_words as $word) {
        $word = trim(mb_strtolower($word, 'UTF-8'));
        if ($word === '') continue;

        if (mb_strpos($text_lower, $word) !== false) {
            return true;
        }
    }
    return false;
}

function contains_link_or_html($text) {
    if (preg_match('/https?:\/\/|www\./i', $text)) return true;
    if (preg_match('/<[^>]*>/', $text)) return true;
    return false;
}

$nickname = isset($_POST['nickname']) ? trim($_POST['nickname']) : '';
$score    = isset($_POST['score']) ? intval($_POST['score']) : 0;

if (contains_bad_word($nickname, $bad_words) || contains_link_or_html($nickname)) {
    die("Некорректный никнейм!");
}

$db = new mysqli("localhost", "a1239072_adminka", "xJ2nK2yF3a", "a1239072_core-video");
$db->set_charset("utf8mb4");

if ($db->connect_error) {
    die("Ошибка подключения: " . $db->connect_error);
}

$nickname = substr($_POST['nickname'], 0, 16); // максимум 16 символов
$score = intval($_POST['score']);

$stmt = $db->prepare("INSERT INTO scores (nickname, score) VALUES (?, ?)");
$stmt->bind_param("si", $nickname, $score);
$stmt->execute();
$stmt->close();
$db->close();

echo "ok";
?>
