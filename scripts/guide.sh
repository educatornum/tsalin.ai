#1. Салбар болон мэргэжилүүдийг шинэчлэх /industies-last-review.json

npm run seed:industries:last

# Total industries in industies-last-review.json: 23
# 1. Менежмент (Management) - 31 majors
# 2. Нягтлан, Санхүү (Accounting & Finance) - 32 majors
# 3. Боловсрол (Education & Training) - 29 majors
# 4. Хэрэглэгчийн үйлчилгээ (Customer Service) - 31 majors
# 5. Өгөгдөл ба Аналитик (Data & Analytics) - 32 majors
# 6. Дизайн ба Контент (Design & Creative) - 32 majors
# 7. Маркетинг ба Борлуулалт (Marketing & Sales) - 33 majors
# 8. Мэдээллийн технологи (IT & Software Engineering) - 36 majors
# 9. Хууль ба Эрсдэл (Legal, Risk & Compliance) - 32 majors
# 10. Хүний нөөц ба Захиргаа (HR & Administration) - 30 majors
# 11. Барилга ба Инженерчлэл (Construction & Engineering) - 28 majors
# 12. Уул уурхай ба Машин механизм (Mining & Heavy Machinery) - 28 majors
# 13. Үйлдвэрлэл ба Үйлдвэрийн дэмжлэг (Manufacturing & Production) - 30 majors
# 14. ХАБЭА (Health, Safety & Environment) - 28 majors
# 15. Эрүүл мэнд (Healthcare & Medical) - 30 majors
# 16. Зочлох үйлчилгээ ба Хоол (Hospitality, Food & Beverage) - 27 majors
# 17. Тээвэр ба Логистик (Transportation & Logistics) - 30 majors
# 18. Авто засвар ба Механик (Auto Repair & Mechanics) - 28 majors
# 19. Санхүүгийн үйлчилгээ ба Даатгал (Financial Services & Insurance) - 28 majors
# 20. Аюулгүй байдал ба Хамгаалалт (Security & Protective Services) - 27 majors
# 21. Хөдөө аж ахуй (Agriculture & Environmental) - 28 majors
# 22. Туслах үйлчилгээ (General Services) - 28 majors
# 23. Бусад мэргэжил (Other / Specialized) - 27 majors



# Prompt

# Based on the resume below, Generate realistic monthly salaries in Mongolia for up to 5 potential current and future positions for the candidate. 

# Monthly salaries should be estimated for this specific candidate per month. How much would the candidate earn per month based on his profession, education, experience, projects, skills, professional achievements, and seniority. Put emphasis on the work experience and past projects if candidate worked at an organization longer than 2 years. Do not speculate and be realistic.

# Each role must be an object with these fields:
# - role_en: job title (string) in English 
# - role_mn: job title (string) in Mongolian
# - salary: average monthly salary in MNT (integer) + add  12.5%  on top of it
# - experience: minimum years of relevant experience (integer)
# - industry: industry ID from the list below (string)

# Assign industries using these IDs:
# _id,name_mn,name_en
# 68eb4ec58fe2edca39211a0e = Management = Менежмент
# 68eb4ec58fe2edca39211a0f = Accounting & Finance = Нягтлан, Санхүү
# 68eb4ec58fe2edca39211a10 = Education & Training = Боловсрол
# 68eb4ec58fe2edca39211a11 = Customer Service = Хэрэглэгчийн үйлчилгээ
# 68eb4ec58fe2edca39211a12 = Data & Analytics = Өгөгдөл ба Аналитик
# 68eb4ec58fe2edca39211a13 = Design & Creative = Дизайн ба Контент
# 68eb4ec58fe2edca39211a14 = Marketing & Sales = Маркетинг ба Борлуулалт
# 68eb4ec58fe2edca39211a15 = IT & Software Engineering = Мэдээллийн технологи
# 68eb4ec58fe2edca39211a16 = Legal, Risk & Compliance = Хууль ба Эрсдэл
# 68eb4ec58fe2edca39211a17 = HR & Administration = Хүний нөөц ба Захиргаа
# 68eb4ec58fe2edca39211a18 = Construction & Engineering = Барилга ба Инженерчлэл
# 68eb4ec58fe2edca39211a19 = Mining & Heavy Machinery = Уул уурхай ба Машин механизм
# 68eb4ec58fe2edca39211a1a = Manufacturing & Production = Үйлдвэрлэл ба Үйлдвэрийн дэмжлэг
# 68eb4ec58fe2edca39211a1b = Manufacturing & Production = Үйлдвэрлэл ба Үйлдвэрийн дэмжлэг
# 68eb4ec58fe2edca39211a1c = Health, Safety & Environment = ХАБЭА
# 68eb4ec58fe2edca39211a1d = Healthcare & Medical = Эрүүл мэнд
# 68eb4ec58fe2edca39211a1e = Hospitality, Food & Beverage = Зочлох үйлчилгээ ба Хоол
# 68eb4ec58fe2edca39211a1f = Transportation & Logistics = Тээвэр ба Логистик
# 68eb4ec58fe2edca39211a20 = Transportation & Logistics = Тээвэр ба Логистик
# 68eb4ec58fe2edca39211a21 = Auto Repair & Mechanics = Авто засвар ба Механик
# 68eb4ec58fe2edca39211a22 = Financial Services & Insurance = Санхүүгийн үйлчилгээ ба Даатгал
# 68eb4ec58fe2edca39211a23 = Security & Protective Services = Аюулгүй байдал ба Хамгаалалт
# 68eb4ec58fe2edca39211a24 = Agriculture & Environmental = Хөдөө аж ахуй
# 68eb4ec58fe2edca39211a25 = General Services = Туслах үйлчилгээ
# 68eb4ec58fe2edca39211a26 = Other / Specialized = Бусад мэргэжил
# 68eb4ec58fe2edca39211a27 = FinTech & Blockchain = Санхүүгийн технологи ба Блокчэйн
# 68eb4ec58fe2edca39211a28 = Media, Journalism & Communications = Медиа, Сэтгүүл зүй ба Харилцаа
# 68eb4ec58fe2edca39211a29 = Arts, Culture & Sports = Соёл, Урлаг ба Спорт
# 68eb4ec58fe2edca39211a2a = Public Sector & International Relations = Олон улсын харилцаа ба Төрийн үйлчилгээ
# 68eb4ec58fe2edca39211a2b = Trade, Import & Export = Худалдаа, Импорт ба Экспорт
# 68eb4ec58fe2edca39211a2c = Energy & Infrastructure = Эрчим хүч ба Дэд бүтэц
# 68eb4ec58fe2edca39211a2d = Banking, Loans & Investment = Банк, Зээл ба Хөрөнгө оруулалт
# 68eb4ec58fe2edca39211a2e = E-commerce & Logistics Tech = E-commerce ба Логистик технологи
# 68eb4ec58fe2edca39211a2f = Sustainability & Environmental Science = Байгаль орчин ба Тогтвортой хөгжил
# 68eb4ec58fe2edca39211a30 = EdTech & Research = Боловсролын технологи ба Судалгаа

# Rules:
# - Deduct 20% from salary if the candidate worked and studied at the same time.
# - Base everything only on evidence from the resume.
# - Output only a JSON array, no explanations, no extra text.

# Here is the resume:
# ---
# {resumeText}