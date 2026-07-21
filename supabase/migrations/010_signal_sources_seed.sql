-- ── 010: Seed all built-in signal sources with real RSS feed URLs ────────
-- This migration inserts all signal sources shown in the DataBank UI.
-- The toggle switch in the UI upserts into user_signal_sources referencing these IDs.

insert into public.signal_sources (
  id, name, description, creator_name, price_monthly, api_endpoint, signal_schema, status
) values

('nairametrics',      'Nairametrics',           'Nigeria''s leading financial and business news',                    'Nairametrics',          0,       'https://nairametrics.com/feed/',                                   '{"type":"rss"}',    'active'),
('businessday',       'BusinessDay NG',          'Business and economy coverage from BusinessDay Nigeria',            'BusinessDay',           0,       'https://businessday.ng/feed/',                                    '{"type":"rss"}',    'active'),
('reuters',           'Reuters Finance',         'Global financial news from Reuters',                               'Reuters',               0,       'https://feeds.reuters.com/reuters/businessNews',                  '{"type":"rss"}',    'active'),
('coindesk',          'CoinDesk',                'Crypto and Web3 markets news',                                     'CoinDesk',              0,       'https://www.coindesk.com/arc/outboundfeeds/rss/',                 '{"type":"rss"}',    'active'),
('bloomberg',         'Bloomberg',               'Premium financial data and markets',                               'Bloomberg',             0,       'https://feeds.bloomberg.com/markets/news.rss',                    '{"type":"rss"}',    'active'),
('stears-podcast',    'The Stears Podcast',      'Nigerian Economy deep dives from Stears',                          'Stears',                0,       'https://feeds.buzzsprout.com/1554201.rss',                        '{"type":"podcast"}','active'),
('wedontdostocks',    'We Don''t Do Stocks',      'African investing podcast',                                         'We Don''t Do Stocks',   0,       'https://anchor.fm/s/wedontdostocks/podcast/rss',                  '{"type":"podcast"}','active'),
('planet-money',      'Planet Money (NPR)',       'Global economics explained simply',                                'NPR',                   0,       'https://feeds.npr.org/510289/podcast.xml',                        '{"type":"podcast"}','active'),
('invest-like-best',  'Invest Like the Best',    'Conversations with global investors and allocators',               'Colossus',              0,       'https://feeds.megaphone.fm/investlikethebest',                    '{"type":"podcast"}','active'),
('stears-weekly',     'Stears Weekly',           'Nigeria economics newsletter',                                     'Stears',                0,       'https://stears.co/rss/',                                          '{"type":"newsletter"}','active'),
('techcabal',         'TechCabal Daily',         'African tech and venture capital news',                            'TechCabal',             0,       'https://techcabal.com/feed/',                                     '{"type":"newsletter"}','active'),
('hustle',            'The Hustle',              'Business and finance news for founders',                           'The Hustle',            0,       'https://thehustle.co/feed/',                                      '{"type":"newsletter"}','active')

on conflict (id) do update set
  name          = excluded.name,
  description   = excluded.description,
  api_endpoint  = excluded.api_endpoint,
  signal_schema = excluded.signal_schema,
  status        = excluded.status;
