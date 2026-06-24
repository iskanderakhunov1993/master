import {
  PrismaClient,
  UserRole,
  BudgetType,
  RepairStatus,
  Urgency,
  OfferStatus,
  NotificationType,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean up in reverse dependency order
  await prisma.notification.deleteMany()
  await prisma.homeRepairHistory.deleteMany()
  await prisma.review.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.offer.deleteMany()
  await prisma.repairRequestPhoto.deleteMany()
  await prisma.portfolio.deleteMany()
  await prisma.repairRequest.deleteMany()
  await prisma.address.deleteMany()
  await prisma.masterSubscription.deleteMany()
  await prisma.verificationDocument.deleteMany()
  await prisma.masterCategory.deleteMany()
  await prisma.masterProfile.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('test123', 10)
  const adminPasswordHash = await bcrypt.hash('admin123', 10)

  // --- Categories ---
  const [catPlumbing, catElectrical, catFurniture, catAppliances, catCleaning, catMoving] =
    await Promise.all([
      prisma.category.create({ data: { name: 'Сантехника', slug: 'plumbing', icon: '🔧' } }),
      prisma.category.create({ data: { name: 'Электрика', slug: 'electrical', icon: '⚡' } }),
      prisma.category.create({ data: { name: 'Сборка мебели', slug: 'furniture', icon: '🪑' } }),
      prisma.category.create({ data: { name: 'Бытовая техника', slug: 'appliances', icon: '🧺' } }),
      prisma.category.create({ data: { name: 'Клининг', slug: 'cleaning', icon: '🧹' } }),
      prisma.category.create({ data: { name: 'Переезд', slug: 'moving', icon: '🚛' } }),
    ])

  // --- Users ---
  const elena = await prisma.user.create({
    data: {
      role: UserRole.CLIENT,
      name: 'Елена Петрова',
      phone: '+7-900-111-22-33',
      email: 'elena@test.com',
      passwordHash,
      ratingAvg: 4.8,
      ratingCount: 6,
    },
  })

  const alexey = await prisma.user.create({
    data: {
      role: UserRole.MASTER,
      name: 'Алексей Соколов',
      phone: '+7-900-222-33-44',
      email: 'alexey@test.com',
      passwordHash,
      ratingAvg: 4.9,
      ratingCount: 148,
      masterProfile: {
        create: {
          bio: 'Сантехник с опытом 12 лет. Выполняю все виды сантехнических работ: замена смесителей, установка унитазов, подключение стиральных и посудомоечных машин, устранение течей.',
          experienceYears: 12,
          isVerified: true,
          city: 'Москва',
          district: 'Аэропорт',
          workRadiusKm: 10,
          isAvailableNow: true,
          freeResponsesLeft: 0,
          guaranteeDays: 30,
        },
      },
    },
    include: { masterProfile: true },
  })

  const mikhail = await prisma.user.create({
    data: {
      role: UserRole.MASTER,
      name: 'Михаил Волков',
      phone: '+7-900-333-44-55',
      email: 'mikhail@test.com',
      passwordHash,
      ratingAvg: 4.8,
      ratingCount: 73,
      masterProfile: {
        create: {
          bio: 'Электрик с допуском до 1000В. Замена проводки, установка розеток и выключателей, подключение электроплит, диагностика неисправностей.',
          experienceYears: 8,
          isVerified: true,
          city: 'Москва',
          district: 'Сокол',
          workRadiusKm: 15,
          isAvailableNow: false,
          freeResponsesLeft: 2,
          guaranteeDays: 14,
        },
      },
    },
    include: { masterProfile: true },
  })

  const igor = await prisma.user.create({
    data: {
      role: UserRole.MASTER,
      name: 'Игорь Новиков',
      phone: '+7-900-444-55-66',
      email: 'igor@test.com',
      passwordHash,
      ratingAvg: 4.7,
      ratingCount: 42,
      masterProfile: {
        create: {
          bio: 'Сантехник, выполняю мелкий и средний ремонт. Работаю быстро и аккуратно.',
          experienceYears: 5,
          isVerified: false,
          city: 'Москва',
          district: 'Тимирязевский',
          workRadiusKm: 8,
          isAvailableNow: true,
          freeResponsesLeft: 3,
          guaranteeDays: 30,
        },
      },
    },
    include: { masterProfile: true },
  })

  const admin = await prisma.user.create({
    data: {
      role: UserRole.ADMIN,
      name: 'Админ',
      email: 'admin@test.com',
      passwordHash: adminPasswordHash,
    },
  })

  // --- Master Categories ---
  await prisma.masterCategory.createMany({
    data: [
      { masterId: alexey.masterProfile!.id, categoryId: catPlumbing.id },
      { masterId: mikhail.masterProfile!.id, categoryId: catElectrical.id },
      { masterId: igor.masterProfile!.id, categoryId: catPlumbing.id },
    ],
  })

  // --- Master Subscriptions ---
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await prisma.masterSubscription.create({
    data: {
      masterId: alexey.masterProfile!.id,
      planName: 'BASIC',
      responsesLeft: 27,
      responsesTotal: 30,
      startsAt: now,
      expiresAt: thirtyDaysLater,
      isActive: true,
    },
  })

  // --- Portfolio for Alexey ---
  await prisma.portfolio.createMany({
    data: [
      {
        masterId: alexey.masterProfile!.id,
        title: 'Замена смесителя на кухне',
        description: 'Демонтаж старого смесителя, установка нового Grohe с подключением гибких подводок.',
        categoryId: catPlumbing.id,
        price: 2800,
        photoBefore: '/uploads/portfolio/smesitel-before.jpg',
        photoAfter: '/uploads/portfolio/smesitel-after.jpg',
        isVerified: true,
      },
      {
        masterId: alexey.masterProfile!.id,
        title: 'Устранение течи в ванной',
        description: 'Замена прокладок и уплотнителей, устранение протечки в месте соединения труб.',
        categoryId: catPlumbing.id,
        price: 1500,
        photoBefore: '/uploads/portfolio/tech-before.jpg',
        photoAfter: '/uploads/portfolio/tech-after.jpg',
        isVerified: true,
      },
      {
        masterId: alexey.masterProfile!.id,
        title: 'Подключение стиральной машины',
        description: 'Подключение стиральной машины Samsung к водопроводу и канализации с установкой крана.',
        categoryId: catPlumbing.id,
        price: 3500,
        photoBefore: '/uploads/portfolio/stiralka-before.jpg',
        photoAfter: '/uploads/portfolio/stiralka-after.jpg',
        isVerified: false,
      },
    ],
  })

  // --- Address for Elena ---
  const address = await prisma.address.create({
    data: {
      userId: elena.id,
      title: 'Квартира',
      city: 'Москва',
      district: 'Аэропорт',
      street: 'ул. Черняховского',
      house: '4',
      apartment: '15',
    },
  })

  // --- Repair Request 1: In Progress ---
  const request1 = await prisma.repairRequest.create({
    data: {
      clientId: elena.id,
      categoryId: catPlumbing.id,
      addressId: address.id,
      title: 'Течёт смеситель на кухне',
      description: 'Смеситель на кухне начал подтекать из-под ручки. Нужна замена или ремонт. Смеситель стоит около 5 лет.',
      budgetAmount: 3000,
      budgetType: BudgetType.NEGOTIABLE,
      preferredDate: new Date(),
      preferredTimeFrom: '10:00',
      preferredTimeTo: '18:00',
      urgency: Urgency.NORMAL,
      status: RepairStatus.IN_PROGRESS,
      selectedMasterId: alexey.id,
      finalPrice: 2800,
      photos: {
        create: [
          { url: '/uploads/requests/smesitel-1.jpg' },
          { url: '/uploads/requests/smesitel-2.jpg' },
        ],
      },
    },
  })

  // Offers for request 1
  await prisma.offer.create({
    data: {
      repairRequestId: request1.id,
      masterId: alexey.masterProfile!.id,
      price: 2800,
      comment: 'Могу приехать сегодня. Есть все необходимые расходники с собой.',
      availableDate: new Date(),
      availableTimeFrom: '14:00',
      availableTimeTo: '16:00',
      guaranteeDays: 30,
      status: OfferStatus.ACCEPTED,
    },
  })

  await prisma.offer.create({
    data: {
      repairRequestId: request1.id,
      masterId: mikhail.masterProfile!.id,
      price: 3200,
      comment: 'Смогу посмотреть завтра утром.',
      availableDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      availableTimeFrom: '09:00',
      availableTimeTo: '12:00',
      guaranteeDays: 14,
      status: OfferStatus.REJECTED,
    },
  })

  // Chat messages for request 1
  await prisma.chatMessage.createMany({
    data: [
      {
        repairRequestId: request1.id,
        senderId: alexey.id,
        message: 'Здравствуйте, Елена! Посмотрел фото, похоже на износ картриджа. Возьму запасной с собой.',
      },
      {
        repairRequestId: request1.id,
        senderId: elena.id,
        message: 'Отлично, буду ждать! Домофон 15.',
      },
      {
        repairRequestId: request1.id,
        senderId: alexey.id,
        message: 'Выезжаю, буду примерно через 30 минут.',
      },
    ],
  })

  // --- Repair Request 2: Published ---
  await prisma.repairRequest.create({
    data: {
      clientId: elena.id,
      categoryId: catElectrical.id,
      addressId: address.id,
      title: 'Не работает розетка',
      description: 'Перестала работать розетка в спальне. Автомат не выбивает, но розетка не даёт ток. Нужна диагностика и ремонт.',
      budgetAmount: 2500,
      budgetType: BudgetType.NEGOTIABLE,
      preferredDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      preferredTimeFrom: '10:00',
      preferredTimeTo: '20:00',
      urgency: Urgency.NORMAL,
      status: RepairStatus.PUBLISHED,
    },
  })

  // --- Review ---
  await prisma.review.create({
    data: {
      repairRequestId: request1.id,
      reviewerId: elena.id,
      revieweeId: alexey.id,
      rating: 5,
      comment: 'Приехал быстро, сделал аккуратно. Всё объяснил и показал. Рекомендую!',
      punctualityRating: 5,
      priceFairnessRating: 5,
      qualityRating: 5,
    },
  })

  // --- Notifications ---
  await prisma.notification.createMany({
    data: [
      {
        userId: elena.id,
        type: NotificationType.NEW_OFFER,
        title: 'Мастер откликнулся на вашу заявку',
        body: 'Алексей Соколов предложил выполнить заявку "Течёт смеситель на кухне" за 2 800 ₽.',
        isRead: true,
      },
      {
        userId: alexey.id,
        type: NotificationType.NEW_REQUEST_NEARBY,
        title: 'Новая заявка рядом',
        body: 'Новая заявка "Не работает розетка" в районе Аэропорт. Бюджет: 2 500 ₽.',
        isRead: false,
      },
    ],
  })

  console.log('Seed completed successfully!')
  console.log('Test accounts:')
  console.log('  Client:  elena@test.com / test123')
  console.log('  Master1: alexey@test.com / test123')
  console.log('  Master2: mikhail@test.com / test123')
  console.log('  Master3: igor@test.com / test123')
  console.log('  Admin:   admin@test.com / admin123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
