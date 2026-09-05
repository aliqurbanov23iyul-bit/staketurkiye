STAKE TÜRKİYE PORTAL v2
=======================

Bu proje statik landing page değil; Vercel Serverless API + Neon Postgres destekli çok sayfalı portaldır.

SAYFALAR
- /index.html                 Ana sayfa
- /liderlik-tablosu.html      Google Sheets canlı leaderboard
- /cevrim-turnuvasi.html      Çevrim turnuvası
- /kampanyalar.html           Kampanyalar
- /turnuvalar.html            Turnuvalar
- /sikca-sorulan-sorular.html SSS
- /stake.html                 Kayıt / Kıbrıs kodu
- /admin.html                 Yönetim paneli

VERCEL KURULUMU
1) Projeyi GitHub'a yükle ve Vercel'e Import et.
2) Vercel projesinde Storage / Marketplace üzerinden bir Neon Postgres database bağla.
   En önemli environment variable: DATABASE_URL
3) Vercel > Project > Settings > Environment Variables kısmında ekle:
   ADMIN_PASSWORD = senin güçlü admin parolan
   ADMIN_SECRET   = uzun ve rastgele en az 32 karakterlik gizli değer
4) Redeploy yap.
5) https://seninsiten.vercel.app/admin.html adresini aç ve ADMIN_PASSWORD ile giriş yap.

Not: Database tablosunu elle oluşturman gerekmez. İlk okuma/kayıtta backend CREATE TABLE IF NOT EXISTS ile otomatik hazırlar.

GOOGLE SHEETS LEADERBOARD
- Admin > Liderlik bölümüne normal Google Sheets URL'sini yapıştır.
- Sheet paylaşımı "Bağlantıya sahip herkes görüntüleyebilir" olmalıdır.
- İlk satır kolon başlıkları olmalıdır. Örn: Sıra | Kullanıcı | Çevrim | Ödül
- Backend Sheet ID ve gid bilgisini URL'den çıkarır, CSV verisini server-side alır ve frontend'e JSON döndürür.
- Sayfa varsayılan olarak her 30 saniyede yenilenir; admin panelden değiştirilebilir.

NEDEN GITHUB'A YAZMIYOR?
Vercel deploy dosya sistemi kalıcı değildir. Admin değişiklikleri GitHub dosyalarına değil Postgres database'e kaydedilir. Bu nedenle yeni deploy yapılsa bile içerik kaybolmaz ve admin kaydından sonra ziyaretçiler yeni içeriği anında görür.

GÜVENLİK
- Admin parolası HTML/JS içine yazılmaz.
- Login sunucuda /api/login üzerinden doğrulanır.
- Başarılı login sonrası HttpOnly, SameSite=Strict imzalı cookie kullanılır.
- /api/content POST yalnızca geçerli admin cookie ile çalışır.
- ADMIN_SECRET ve ADMIN_PASSWORD GitHub'a koyulmamalıdır; yalnızca Vercel Environment Variables kullanılmalıdır.

ÖNEMLİ
Bu site bağımsız affiliate/tanıtım sayfası olarak hazırlanmıştır; resmi Stake web sitesi izlenimi verilmemelidir. Kampanya metinleri ve tutarlarını yalnızca doğrulanmış gerçek bilgilerle güncelleyin.

V3 EKLENTİLERİ
--------------
- Ana sayfada yönetilebilir KIBRIS bonus kartı eklendi: $21 bonus / %200 yatırım bonusu alanları, kopyalanabilir KIBRIS kodu ve referral CTA.
- Admin panel Dashboard, Bonus Alanı ve Portal Üyeleri sekmeleriyle geliştirildi.
- Portal üyelik sistemi eklendi: hesap.html
- Kullanıcı API'leri: /api/register, /api/user-login, /api/user-session, /api/user-logout
- Admin kullanıcı listesi: /api/admin-users
- Üye parolaları düz metin tutulmaz; PBKDF2 + salt ile hashlenir. Oturumlar HttpOnly cookie ve database session token ile çalışır.
- Portal hesabı Stake hesabından tamamen ayrıdır; kullanıcıdan Stake şifresi veya finansal bilgi istenmez.
- Mevcut DATABASE_URL yeterlidir. Yeni environment variable gerekmiyor.
