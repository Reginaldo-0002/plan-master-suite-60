-- Insert sample content for testing
INSERT INTO public.content (
  title, 
  description, 
  content_type, 
  required_plan, 
  status, 
  is_active, 
  show_in_carousel,
  video_url,
  hero_image_url
) VALUES 
-- Products
('Produto Premium 1', 'Um produto exclusivo para clientes VIP', 'product', 'vip', 'active', true, true, 'https://youtube.com/watch?v=example1', 'https://via.placeholder.com/400x300'),
('Produto Profissional', 'Ferramenta avançada para usuários Pro', 'product', 'pro', 'active', true, false, 'https://youtube.com/watch?v=example2', 'https://via.placeholder.com/400x300'),
('Produto Gratuito', 'Produto básico disponível para todos', 'product', 'free', 'active', true, true, 'https://youtube.com/watch?v=example3', 'https://via.placeholder.com/400x300'),

-- Courses
('Curso Básico de Marketing', 'Aprenda marketing digital do zero', 'course', 'free', 'active', true, true, 'https://youtube.com/watch?v=example4', 'https://via.placeholder.com/400x300'),
('Curso Avançado de Vendas', 'Técnicas avançadas de vendas online', 'course', 'vip', 'active', true, false, 'https://youtube.com/watch?v=example5', 'https://via.placeholder.com/400x300'),
('Masterclass de Empreendedorismo', 'Para empreendedores de alto nível', 'course', 'pro', 'active', true, true, 'https://youtube.com/watch?v=example6', 'https://via.placeholder.com/400x300'),

-- Tools
('Calculadora de ROI', 'Ferramenta para calcular retorno de investimento', 'tool', 'free', 'active', true, false, 'https://example.com/roi-calculator', 'https://via.placeholder.com/400x300'),
('Gerador de Landing Pages', 'Crie landing pages profissionais', 'tool', 'vip', 'active', true, true, 'https://example.com/landing-generator', 'https://via.placeholder.com/400x300'),
('Suite de Automação', 'Automatize todo seu negócio', 'tool', 'pro', 'active', true, false, 'https://example.com/automation-suite', 'https://via.placeholder.com/400x300'),

-- Tutorials
('Como Começar nas Redes Sociais', 'Tutorial completo para iniciantes', 'tutorial', 'free', 'active', true, true, 'https://youtube.com/watch?v=tutorial1', 'https://via.placeholder.com/400x300'),
('Estratégias de Monetização', 'Como monetizar seu conteúdo', 'tutorial', 'vip', 'active', true, false, 'https://youtube.com/watch?v=tutorial2', 'https://via.placeholder.com/400x300'),
('Scaling Your Business', 'Como escalar seu negócio rapidamente', 'tutorial', 'pro', 'active', true, true, 'https://youtube.com/watch?v=tutorial3', 'https://via.placeholder.com/400x300');

-- Insert some topics for the content
INSERT INTO public.content_topics (
  content_id,
  title,
  description,
  topic_order,
  is_active,
  video_urls,
  pdf_urls
) VALUES 
((SELECT id FROM public.content WHERE title = 'Produto Premium 1' LIMIT 1), 'Módulo 1: Introdução', 'Introdução ao produto premium', 1, true, ARRAY['https://youtube.com/watch?v=mod1'], ARRAY['https://example.com/pdf1.pdf']),
((SELECT id FROM public.content WHERE title = 'Produto Premium 1' LIMIT 1), 'Módulo 2: Configuração', 'Como configurar o produto', 2, true, ARRAY['https://youtube.com/watch?v=mod2'], ARRAY['https://example.com/pdf2.pdf']),
((SELECT id FROM public.content WHERE title = 'Curso Básico de Marketing' LIMIT 1), 'Aula 1: Fundamentos', 'Fundamentos do marketing digital', 1, true, ARRAY['https://youtube.com/watch?v=aula1'], ARRAY['https://example.com/aula1.pdf']),
((SELECT id FROM public.content WHERE title = 'Curso Básico de Marketing' LIMIT 1), 'Aula 2: Estratégias', 'Estratégias essenciais de marketing', 2, true, ARRAY['https://youtube.com/watch?v=aula2'], ARRAY['https://example.com/aula2.pdf']);