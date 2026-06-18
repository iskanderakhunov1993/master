import { PrismaClient, UserRole, BudgetType, RepairStatus, Urgency } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.homeRepairHistory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.repairRequestPhoto.deleteMany();
  await prisma.repairRequest.deleteMany();
  await prisma.address.deleteMany();
  await prisma.masterCategory.deleteMany();
  await prisma.masterProfile.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Сантехника", slug: "plumbing", icon: "wrench" } }),
    prisma.category.create({ data: { name: "Электрика", slug: "electric", icon: "zap" } }),
    prisma.category.create({ data: { name: "Сборка мебели", slug: "furniture", icon: "hammer" } }),
    prisma.category.create({ data: { name: "Муж на час", slug: "handyman", icon: "toolbox" } }),
    prisma.category.create({ data: { name: "Двери и замки", slug: "locks", icon: "key" } }),
    prisma.category.create({ data: { name: "Бытовая техника", slug: "appliances", icon: "plug" } }),
  ]);

  const client = await prisma.user.create({
    data: {
      role: UserRole.CLIENT,
      name: "Александр",
      phone: "+79990000001",
      email: "client@homefix.local",
      passwordHash,
      ratingAvg: 4.9,
      ratingCount: 12,
    },
  });

  const masterUser = await prisma.user.create({
    data: {
      role: UserRole.MASTER,
      name: "Алексей Соколов",
      phone: "+79990000002",
      email: "master@homefix.local",
      passwordHash,
      ratingAvg: 4.96,
      ratingCount: 128,
      masterProfile: {
        create: {
          bio: "Сантехник с опытом срочного ремонта, установки кранов и замены сифонов.",
          experienceYears: 8,
          isVerified: true,
          city: "Москва",
          district: "Хамовники",
          workRadiusKm: 8,
          isAvailableNow: true,
        },
      },
    },
    include: { masterProfile: true },
  });

  const secondMaster = await prisma.user.create({
    data: {
      role: UserRole.MASTER,
      name: "Михаил Романов",
      phone: "+79990000003",
      email: "mikhail@homefix.local",
      passwordHash,
      ratingAvg: 4.89,
      ratingCount: 86,
      masterProfile: {
        create: {
          bio: "Мастер на час: мебель, мелкий ремонт, крепления и бытовые задачи.",
          experienceYears: 6,
          isVerified: true,
          city: "Москва",
          district: "Арбат",
          workRadiusKm: 10,
          isAvailableNow: true,
        },
      },
    },
    include: { masterProfile: true },
  });

  const admin = await prisma.user.create({
    data: {
      role: UserRole.ADMIN,
      name: "Администратор",
      email: "admin@homefix.local",
      passwordHash,
    },
  });

  await prisma.masterCategory.createMany({
    data: [
      { masterId: masterUser.masterProfile!.id, categoryId: categories[0].id },
      { masterId: masterUser.masterProfile!.id, categoryId: categories[5].id },
      { masterId: secondMaster.masterProfile!.id, categoryId: categories[2].id },
      { masterId: secondMaster.masterProfile!.id, categoryId: categories[3].id },
    ],
  });

  const address = await prisma.address.create({
    data: {
      userId: client.id,
      title: "Квартира",
      city: "Москва",
      district: "Хамовники",
      street: "ул. Ефремова",
      house: "12",
      apartment: "47",
      comment: "Домофон 47, вход со двора",
    },
  });

  const request = await prisma.repairRequest.create({
    data: {
      clientId: client.id,
      categoryId: categories[0].id,
      addressId: address.id,
      title: "Течёт кран на кухне",
      description: "Нужно снять старый кран и установить новый. Кран уже куплен.",
      budgetAmount: 4500,
      budgetType: BudgetType.NEGOTIABLE,
      preferredDate: new Date(),
      preferredTimeFrom: "16:00",
      preferredTimeTo: "20:00",
      urgency: Urgency.URGENT,
      status: RepairStatus.IN_NEGOTIATION,
      photos: {
        create: [{ url: "/uploads/faucet-result.jpg" }],
      },
    },
  });

  const acceptedOffer = await prisma.offer.create({
    data: {
      repairRequestId: request.id,
      masterId: masterUser.masterProfile!.id,
      price: 4500,
      comment: "Буду через 25 минут, расходники возьму с собой.",
      availableDate: new Date(),
      availableTimeFrom: "16:30",
      availableTimeTo: "18:30",
    },
  });

  await prisma.offer.create({
    data: {
      repairRequestId: request.id,
      masterId: secondMaster.masterProfile!.id,
      price: 5000,
      comment: "Могу приехать сегодня к 18:00.",
      availableDate: new Date(),
      availableTimeFrom: "18:00",
      availableTimeTo: "20:00",
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      { repairRequestId: request.id, senderId: masterUser.id, message: "Добрый день! Буду у вас примерно через 25 минут." },
      { repairRequestId: request.id, senderId: client.id, message: "Отлично, домофон 47. Напишите, когда подойдёте." },
    ],
  });

  await prisma.repairRequest.update({
    where: { id: request.id },
    data: {
      status: RepairStatus.ASSIGNED,
      selectedMasterId: masterUser.id,
      finalPrice: acceptedOffer.price,
    },
  });

  await prisma.review.create({
    data: {
      repairRequestId: request.id,
      reviewerId: client.id,
      revieweeId: masterUser.id,
      rating: 5,
      comment: "Мастер приехал быстро, аккуратно установил кран и показал результат.",
      punctualityRating: 5,
      priceFairnessRating: 5,
      qualityRating: 5,
    },
  });

  await prisma.homeRepairHistory.create({
    data: {
      clientId: client.id,
      addressId: address.id,
      repairRequestId: request.id,
      masterId: masterUser.id,
      categoryId: categories[0].id,
      title: "Установка кухонного крана",
      description: "Старый кран снят, новый установлен, проверена герметичность.",
      finalPrice: 4500,
      completedAt: new Date(),
      warrantyUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      notes: "Сохранить контакт мастера для повторного вызова.",
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "SYSTEM",
      title: "Seed готов",
      body: "Демо-данные HomeFix успешно созданы.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
