# Chrome Web Store Nashr Qilish Bo'yicha Qo'llanma 🚀

Flash Note kengaytmasini Chrome Web Store'ga yuklash va birinchi urinishdayoq tasdiqdan o'tkazish (review) bo'yicha batafsil qo'llanma.

---

## 1. Tayyorlangan Mahsulot
Loyiha tarkibidan faqat kerakli fayllarni o'z ichiga olgan **`flash_note.zip`** arxivi yaratildi va loyiha ildiziga joylashtirildi. 

### ZIP tarkibiga kirgan fayllar:
* `manifest.json` — Yangilangan versiya `2.1.2` va rasmiy tasniflar.
* `background.js` — Service worker (alarmlar va context menyular uchun).
* `sidepanel.html` & `sidepanel.js` — Asosiy yon panel va notelar interfeysi.
* `content.js`, `anchor.js`, `floating-ui.js` — Veb sahifalarga "Floating Notes" (elementlarga notelar) yopishtiruvchi skriptlar.
* `icons/` — `16px`, `64px`, va `128px` o'lchamdagi rasmiy ikonkalar.
* `flashnote.html` — Legacy redirect.

*Rivojlantirishga oid ortiqcha fayllar (`.git`, `.gitignore`, `README.md`, `flashnote.js`) arxivga qo'shilmagan. Bu review jarayonini tezlashtiradi.*

---

## 2. Chrome Developer Account ochish
Kengaytmalarni nashr qilish uchun Chrome Developer konsolidan ro'yxatdan o'tish zarur:
1. [Chrome Developer Console](https://chrome.google.com/webstore/devconsole) sahifasiga kiring.
2. Google hisobingiz bilan tizimga kiring.
3. Bir martalik **$5** miqdoridagi developer to'lovini amalga oshiring.

---

## 3. Kengaytmani yuklash (Uploading)
1. Developer konsolda **"Create new item"** (Yangi element yaratish) tugmasini bosing.
2. Loyiha papkasidagi **`flash_note.zip`** faylini yuklang.

---

## 4. Store Listing (Do'kon sahifasini sozlash)
Muvaffaqiyatli qabul qilinishi uchun quyidagi ma'lumotlarni kiriting:

### 📝 Nom va Tavsif (Title & Description):
* **Nom:** `Flash Note`
* **Qisqa tavsif:** `Sidebar notes • Notes on elements • Page highlights • Reminders`
* **Batafsil tavsif (Description):**
  ```text
  Flash Note — bu tezkor notelar yozish, veb-sahifalardagi muhim matnlarni saqlash va eslatmalar o'rnatish uchun mo'ljallangan qulay va ko'p funksiyali brauzer kengaytmasi.

  Asosiy imkoniyatlar:
  1. Yon Panel (Sidepanel) — Istalgan sahifada yon panelni ochib, real-vaqtda notelar yozish, qidirish va tartiblash imkoniyati.
  2. Elementlarga izohlar (Notes on elements) — Sahifadagi istalgan elementni belgilab, figma-style suzuvchi (floating) notelar yozish va ularga bog'lanish.
  3. Matnni saqlash (Highlights) — Sahifadagi ixtiyoriy matnni sichqoncha bilan belgilash orqali uni bir zumda notelar ro'yxatiga rich-markup ko'rinishida saqlash.
  4. Eslatmalar (Alarms & Reminders) — Har bir note uchun istalgan vaqtga eslatma o'rnatish. Belgilangan vaqtda brauzer push-bildirishnomasi orqali sizni ogohlantiradi.
  5. Avtomatik Tungi Rejim — Tizim sozlamalariga moslashuvchi to'liq moslashuvchan premium dizayn.
  ```

### 🖼️ Grafika (Visual Assets):
* **Store Icon:** Loyihangizdagi `icons/icon128.png` rasmini yuklang.
* **Screenshots (Skrinshotlar):** Yon panel va sahifadagi suzuvchi izohlar aks etgan kamida 2-3 ta skrinshot yuklang (o'lchami: 1280x800 yoki 640x400 piksel).

---

## 5. Ruxsatnomalar asoslanishi (Permissions Justification) ⚠️
Chrome jamoasi manifestda so'ralgan ruxsatnomalarga (permissions) juda jiddiy e'tibor beradi. Ularning har biri uchun quyidagi asoslarni yozishingiz talab qilinadi:

* **`storage` va `unlimitedStorage`:**
  * *Justification:* Used to store and persist user notes, comments, user settings (like themes), and anchor metadata locally on the user's device without hitting quota limits.
* **`sidePanel`:**
  * *Justification:* Used to host the main application UI as a side panel companion, allowing the user to take notes side-by-side with their browser browsing flow.
* **`alarms` va `notifications`:**
  * *Justification:* Used to trigger and schedule specific user alarms and deliver push notifications as active reminders for saved notes.
* **`contextMenus`:**
  * *Justification:* Used to register a quick action in the right-click menu, allowing the user to instantly add a floating note (comment) to any webpage element.

---

## 6. Maxfiylik Siyosati (Privacy Policy) 🔒
Chrome Web Store har doim maxfiylik siyosati havolasini (Privacy Policy URL) talab qiladi.

Loyihadagi `policy/index.html` fayli maxfiylik siyosatini o'z ichiga olgan tayyor HTML sahifadir. Uni bepul va oson tarzda GitHub Pages orqali host qilishingiz mumkin:
1. `Flash.notes` repozitoriyangiz sozlamalariga kiring (**Settings**).
2. Chap menyudan **Pages** bo'limini tanlang.
3. **Build and deployment** bo'limida manbani `Deploy from a branch` qilib, `main` (yoki `master`) tarmog'ini belgilab **Save** tugmasini bosing.
4. Bir necha daqiqadan so'ng sahifangiz faollashadi. Sizning maxfiylik siyosati havolangiz quyidagicha bo'ladi:
   `https://LazizbekDev.github.io/Flash.notes/policy/`
5. Ushbu havolani Developer konsolidagi **Privacy Policy URL** maydoniga kiriting.

---

## 7. Tekshiruv uchun ko'rsatmalar (Test Instructions) 📝
Chrome Web Store tekshiruvchilari (reviewers) kengaytmani to'g'ri tekshira olishlari uchun Developer Console'dagi **"Test instructions"** maydoniga quyidagi inglizcha matnni nusxalab joylashtiring:

```text
No login, signup, or external server authentication is required. Flash Note operates 100% locally and offline, saving all notes and data inside sandboxed browser storage (chrome.storage.local).

Reviewers can verify all core features on any webpage using these simple steps:

1. Open Side Panel:
- Click the extension icon or press "Ctrl+Shift+Z" ("Cmd+Shift+Z" on Mac) to open the side panel.

2. Take Notes:
- Type text in the side panel, then click "Save" or press "Ctrl+Enter" ("Cmd+Enter" on Mac). The note appears in the local list.

3. Create Floating Notes (Page Annotations):
- Click the "Add Floating Note" icon in the header, press "Ctrl+Shift+K" ("Cmd+Shift+K" on Mac), or right-click the page and select "Add Flash Note here".
- The page dims. Click any element (heading, button, etc.) to anchor a note card directly to it. Type content and click away. The floating comment remains pinned when you scroll.

4. Page Highlights:
- Select text on any web page using your mouse cursor, or press "Alt+Shift+F".
- The text is instantly captured as a rich-formatted highlight note in the side panel.

5. Reminders & Local Notifications:
- Hover over any note in the side panel, click the Bell (Alarm) icon, choose a time (e.g., +1 minute), and save.
- When the time arrives, a local alarm will trigger a native desktop push notification containing the note's preview.
```

---

Nashr qilish jarayonida savollar yoki biror muammolar paydo bo'lsa, istalgan vaqtda so'rashingiz mumkin! Omad! 🚀
