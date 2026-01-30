-- TWK Questions
insert into questions (content, type, difficulty, explanation) values
('Berdasarkan UUD 1945, kekuasaan membentuk undang-undang merupakan kekuasaan...', 'TWK', 1, 'Legislatif (DPR) memiliki kekuasaan membentuk UU.'),
('Lambang negara ialah Garuda Pancasila dengan semboyan Bhinneka Tunggal Ika. Pasal berapa yang mengaturnya?', 'TWK', 2, 'Pasal 36A.');

-- TIU Questions
insert into questions (content, type, difficulty, explanation) values
('Jika 2x + 3 = 11, berapakah nilai x?', 'TIU', 1, '2x = 8, maka x = 4.'),
('Semua dokter adalah orang pintar. Sebagian orang pintar suka membaca. Kesimpulan yang benar adalah...', 'TIU', 2, 'Sebagian dokter suka membaca (Tidak bisa disimpulkan secara universal, tapi opsi terbaik biasanya silogisme).');

-- Link Options for TWK 1
insert into options (question_id, content, is_correct) values
((select id from questions where content like 'Berdasarkan UUD 1945%' limit 1), 'Ekskutif', false),
((select id from questions where content like 'Berdasarkan UUD 1945%' limit 1), 'Legislatif', true),
((select id from questions where content like 'Berdasarkan UUD 1945%' limit 1), 'Yudikatif', false),
((select id from questions where content like 'Berdasarkan UUD 1945%' limit 1), 'Federatif', false),
((select id from questions where content like 'Berdasarkan UUD 1945%' limit 1), 'Konstitutif', false);

-- Link Options for TIU 1
insert into options (question_id, content, is_correct) values
((select id from questions where content like 'Jika 2x + 3%' limit 1), '2', false),
((select id from questions where content like 'Jika 2x + 3%' limit 1), '3', false),
((select id from questions where content like 'Jika 2x + 3%' limit 1), '4', true),
((select id from questions where content like 'Jika 2x + 3%' limit 1), '5', false),
((select id from questions where content like 'Jika 2x + 3%' limit 1), '6', false);
