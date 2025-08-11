-- Remove sample data and only keep admin-created content
DELETE FROM public.content WHERE title LIKE 'Exemplo%' OR title LIKE 'Sample%' OR title LIKE 'Curso%' OR title LIKE 'Ferramenta%' OR title LIKE 'Produto%' OR title LIKE 'Tutorial%';

-- Remove sample topics
DELETE FROM public.content_topics WHERE title LIKE 'Introdução%' OR title LIKE 'Conceitos%' OR title LIKE 'Prática%';