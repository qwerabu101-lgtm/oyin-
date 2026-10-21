# Yo'l 3D

Brauzerda ishlaydigan 3D haydash o'yini (Three.js) va Python multiplayer serveri. Hamma narsa o'zimiz yaratgan, mashina va xarita modellari boshqa o'yindan olinmagan.

## Imkoniyatlar
- 3D ochiq shahar: 11 ta ko'cha ikki yo'nalishda, binolar, daraxtlar
- Garaj: 4 mashina turi, 4 rang, 4 sepish, o'zgartiriladigan nomer. Hammasi bepul
- GAI: patrul mashinalari tezlikni oshirsangiz quvadi, to'xtasangiz inspektor Dilnoza jarima yozadi. Qochsangiz jarima ikki baravar
- Radarlar: yo'l bo'yidagi kameralar tezlikni o'lchaydi va avtomatik jarima yozadi
- Radar-detektor (R) va mini xarita
- Multiplayer: Python serveri orqali boshqa o'yinchilarni ismi bilan ko'rasiz

## Boshqarish
W/A/S/D yoki strelkalar, Probel: qo'l tormozi, C: kamera, R: radar-detektor.

## Ishga tushirish
Yakka rejim: GitHub Pages (Settings → Pages) yoki `index.html`. Three.js internetdan yuklanadi.

Multiplayer:
```
pip install -r requirements.txt
python server.py
```
Keyin `http://localhost:8080` ni oching.

## Sozlamalar
Garajda grafika sifati (Past, O'rta, Yuqori, Ultra) va FPS (30, 60, 90, Cheksiz) tanlanadi. 90 FPS faqat ekrani 90 Hz va undan yuqori bo'lgan qurilmada ishlaydi.

## APK olish
1. Barcha fayllarni (`.github` papkasi bilan) GitHub repository'ga yuklang.
2. Repository'dagi Actions bo'limiga kiring, "APK yaratish" ishini ishga tushiring (Run workflow).
3. 5-10 daqiqadan keyin tugagan ish ichidan `yol-3d-apk` faylini yuklab oling va telefonga o'rnating.

APK'siz usul: GitHub Pages havolasini telefonda oching va brauzer menyusidan "Bosh ekranga qo'shish" ni bosing.

## Yangi imkoniyatlar
- 7 mashina turi, tayyor ranglar va istalgan rang tanlagich, 4 sepish
- Davlat nomerlari: UZ, RU, KZ, TR, DE, US
- 4 xarita: Shahar, Qishloq, Cho'l, Qish
- Ovozlar: dvigatel, egzozdagi "bag-bag" portlashlar, to'qnashuv, radar signali, GAI sirenasi, jarima signali
- Egzoz olovi (gaz qo'yib yuborilganda) va Shift bilan nitro (ko'k olov)
- Yuqori va Ultra sifatda soyalar
