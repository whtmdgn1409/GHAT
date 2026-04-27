-- 001_word_packs.sql
INSERT INTO word_packs (word_pack_id, target_lang, difficulty, topic, words_json) VALUES
('wp-en-easy-1', 'en', 'easy', 'daily', '["apple","window","school","friend","market"]'),
('wp-en-medium-1', 'en', 'medium', 'work', '["meeting","deadline","proposal","strategy","budget"]'),
('wp-es-easy-1', 'es', 'easy', 'daily', '["hola","gracias","amigo","comida","escuela"]'),
('wp-ko-hard-1', 'ko', 'hard', 'culture', '["정체성","연결성","협업성","문해력","추론력"]');
