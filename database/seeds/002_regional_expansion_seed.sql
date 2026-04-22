-- ============================================
-- SkyRoute: Regional Expansion Seed Data
-- Africa, South America, and South Asia focus
-- ============================================

-- ============================================
-- 27 Additional Airports
-- ============================================
INSERT INTO airports (iata_code, name, city, country, latitude, longitude, timezone) VALUES
    ('CPT', 'Cape Town International Airport', 'Cape Town', 'South Africa', -33.969556, 18.597222, 'Africa/Johannesburg'),
    ('JNB', 'O. R. Tambo International Airport', 'Johannesburg', 'South Africa', -26.133694, 28.242317, 'Africa/Johannesburg'),
    ('LOS', 'Murtala Muhammed International Airport', 'Lagos', 'Nigeria', 6.577370, 3.321160, 'Africa/Lagos'),
    ('ABV', 'Nnamdi Azikiwe International Airport', 'Abuja', 'Nigeria', 9.006792, 7.263172, 'Africa/Lagos'),
    ('CAI', 'Cairo International Airport', 'Cairo', 'Egypt', 30.121944, 31.405556, 'Africa/Cairo'),
    ('CMN', 'Mohammed V International Airport', 'Casablanca', 'Morocco', 33.367467, -7.589967, 'Africa/Casablanca'),
    ('ADD', 'Addis Ababa Bole International Airport', 'Addis Ababa', 'Ethiopia', 8.977889, 38.799319, 'Africa/Addis_Ababa'),
    ('KGL', 'Kigali International Airport', 'Kigali', 'Rwanda', -1.968628, 30.139450, 'Africa/Kigali'),
    ('ACC', 'Kotoka International Airport', 'Accra', 'Ghana', 5.605186, -0.166786, 'Africa/Accra'),
    ('DAR', 'Julius Nyerere International Airport', 'Dar es Salaam', 'Tanzania', -6.878111, 39.202625, 'Africa/Dar_es_Salaam'),
    ('GRU', 'Sao Paulo-Guarulhos International Airport', 'Sao Paulo', 'Brazil', -23.435556, -46.473056, 'America/Sao_Paulo'),
    ('GIG', 'Rio de Janeiro-Galeao International Airport', 'Rio de Janeiro', 'Brazil', -22.809999, -43.250556, 'America/Sao_Paulo'),
    ('BSB', 'Brasilia International Airport', 'Brasilia', 'Brazil', -15.869167, -47.920833, 'America/Sao_Paulo'),
    ('EZE', 'Ministro Pistarini International Airport', 'Buenos Aires', 'Argentina', -34.822222, -58.535833, 'America/Argentina/Buenos_Aires'),
    ('AEP', 'Jorge Newbery Airfield', 'Buenos Aires', 'Argentina', -34.559175, -58.415606, 'America/Argentina/Buenos_Aires'),
    ('SCL', 'Arturo Merino Benitez International Airport', 'Santiago', 'Chile', -33.392975, -70.785803, 'America/Santiago'),
    ('BOG', 'El Dorado International Airport', 'Bogota', 'Colombia', 4.701594, -74.146947, 'America/Bogota'),
    ('LIM', 'Jorge Chavez International Airport', 'Lima', 'Peru', -12.021889, -77.114319, 'America/Lima'),
    ('UIO', 'Mariscal Sucre International Airport', 'Quito', 'Ecuador', -0.129167, -78.357500, 'America/Guayaquil'),
    ('MVD', 'Carrasco International Airport', 'Montevideo', 'Uruguay', -34.838417, -56.030806, 'America/Montevideo'),
    ('DAC', 'Hazrat Shahjalal International Airport', 'Dhaka', 'Bangladesh', 23.843333, 90.397778, 'Asia/Dhaka'),
    ('CMB', 'Bandaranaike International Airport', 'Colombo', 'Colombo', 7.180756, 79.884117, 'Asia/Colombo'),
    ('KTM', 'Tribhuvan International Airport', 'Kathmandu', 'Nepal', 27.696583, 85.359100, 'Asia/Kathmandu'),
    ('MLE', 'Velana International Airport', 'Male', 'Maldives', 4.191833, 73.529128, 'Indian/Maldives'),
    ('KHI', 'Jinnah International Airport', 'Karachi', 'Pakistan', 24.906547, 67.160797, 'Asia/Karachi'),
    ('LHE', 'Allama Iqbal International Airport', 'Lahore', 'Pakistan', 31.521564, 74.403594, 'Asia/Karachi'),
    ('BLR', 'Kempegowda International Airport', 'Bengaluru', 'India', 13.198889, 77.706111, 'Asia/Kolkata')
ON CONFLICT (iata_code) DO NOTHING;

-- ============================================
-- 15 Additional Airlines
-- ============================================
INSERT INTO airlines (iata_code, name, country) VALUES
    ('SA', 'South African Airways', 'South Africa'),
    ('KQ', 'Kenya Airways', 'Kenya'),
    ('ET', 'Ethiopian Airlines', 'Ethiopia'),
    ('MS', 'Egyptair', 'Egypt'),
    ('AT', 'Royal Air Maroc', 'Morocco'),
    ('P4', 'Air Peace', 'Nigeria'),
    ('LA', 'LATAM Airlines', 'Chile'),
    ('AR', 'Aerolineas Argentinas', 'Argentina'),
    ('AV', 'Avianca', 'Colombia'),
    ('CM', 'Copa Airlines', 'Panama'),
    ('G3', 'Gol Linhas Aereas', 'Brazil'),
    ('PK', 'Pakistan International Airlines', 'Pakistan'),
    ('BG', 'Biman Bangladesh Airlines', 'Bangladesh'),
    ('UL', 'SriLankan Airlines', 'Sri Lanka'),
    ('6E', 'IndiGo', 'India')
ON CONFLICT (iata_code) DO NOTHING;
