/* eslint-disable no-console */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.SEED_FORCE !== "true") {
    console.log("Seed skipped: database already has data (set SEED_FORCE=true to reset).");
    return;
  }

  if (process.env.SEED_FORCE === "true") {
    console.log("SEED_FORCE=true — clearing demo data…");
  }

  await prisma.payment.deleteMany();
  await prisma.trackingHistory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.savedRoute.deleteMany();
  await prisma.favoriteAddress.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.busTrip.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.admin.deleteMany();

  await prisma.pricingRule.deleteMany();
  await prisma.route.deleteMany();
  await prisma.city.deleteMany();
  await prisma.shipmentStatus.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();

  await prisma.pricingRule.createMany({
    data: [
      { key: "base_price_per_kg", value: "118" },
      { key: "distance_factor_per_km", value: "1.25" },
    ],
  });

  const citiesSpec = [
    { name: "Барнаул", lat: 53.3606, lng: 83.7636 },
    { name: "Бийск", lat: 52.5394, lng: 85.2078 },
    { name: "Рубцовск", lat: 51.5278, lng: 81.2188 },
    { name: "Новоалтайск", lat: 53.3920, lng: 83.9366 },
    { name: "Алейск", lat: 52.4926, lng: 82.7822 },
    { name: "Заринск", lat: 53.7063, lng: 84.9315 },
    { name: "Белокуриха", lat: 51.9956, lng: 84.9839 },
  ];

  await prisma.city.createMany({
    data: citiesSpec.map((c) => ({
      ...c,
      region: "Алтайский край",
    })),
  });

  const cities = await prisma.city.findMany({});
  const byName = Object.fromEntries(cities.map((x) => [x.name, x]));

  function pair(a: string, b: string, km: number, hours: number, load: number, pop: number) {
    return {
      originCityId: byName[a].id,
      destinationCityId: byName[b].id,
      distanceKm: km,
      estimatedHours: hours,
      loadPercent: load,
      popularity: pop,
      basePricePerKg: 120,
    };
  }

  await prisma.route.createMany({
    data: [
      pair("Барнаул", "Бийск", 164, 3.8, 48, 120),
      pair("Бийск", "Барнаул", 164, 3.8, 52, 110),
      pair("Барнаул", "Новоалтайск", 18, 0.75, 32, 90),
      pair("Барнаул", "Рубцовск", 320, 6.9, 55, 80),
      pair("Рубцовск", "Барнаул", 320, 6.9, 57, 70),
      pair("Бийск", "Белокуриха", 70, 1.9, 40, 60),
      pair("Бийск", "Заринск", 410, 8.8, 60, 50),
      pair("Барнаул", "Заринск", 215, 4.9, 45, 55),
      pair("Барнаул", "Алейск", 260, 5.9, 50, 45),
      pair("Алейск", "Рубцовск", 180, 3.9, 46, 40),
      pair("Новоалтайск", "Бийск", 148, 3.7, 44, 75),
      pair("Белокуриха", "Барнаул", 68, 1.85, 35, 35),
    ],
  });

  const statuses = await prisma.$transaction([
    prisma.shipmentStatus.create({
      data: { code: "CREATED", label: "Принято к перевозке", sortOrder: 10 },
    }),
    prisma.shipmentStatus.create({
      data: { code: "PICKUP", label: "Погружено", sortOrder: 20 },
    }),
    prisma.shipmentStatus.create({
      data: { code: "IN_TRANSIT", label: "В рейсе", sortOrder: 30 },
    }),
    prisma.shipmentStatus.create({
      data: { code: "HUB", label: "Сортировочный узел", sortOrder: 40 },
    }),
    prisma.shipmentStatus.create({
      data: { code: "LAST_MILE", label: "Выдано перевозчику", sortOrder: 50 },
    }),
    prisma.shipmentStatus.create({
      data: { code: "DELIVERED", label: "Выдано получателю", sortOrder: 60 },
    }),
    prisma.shipmentStatus.create({
      data: { code: "DELAYED", label: "Задержка", sortOrder: 5 },
    }),
  ]);

  const [stCreated, , stTransit, , , stDelivered] = statuses;

  const clientPass = await bcrypt.hash("ClientPass123!", 12);
  const adminPass = await bcrypt.hash("AdminPass123!", 12);

  const demoClient = await prisma.user.create({
    data: {
      email: "client@avia-travel.local",
      passwordHash: clientPass,
      firstName: "Алексей",
      lastName: "Козлов",
      phone: "+7 900 000-00-11",
      role: "USER",
    },
  });

  const opsAdmin = await prisma.user.create({
    data: {
      email: "admin@avia-travel.local",
      passwordHash: adminPass,
      firstName: "Олеся",
      lastName: "Миронова",
      phone: "+7 913 555-42-91",
      role: "ADMIN",
    },
  });

  await prisma.admin.create({
    data: { userId: opsAdmin.id, title: "Руководитель направления" },
  });

  await prisma.bus.createMany({
    data: [
      { plateNumber: "А22 ТР 99", model: "Yutong ZK6119", capacityKg: 1200 },
      { plateNumber: "В55 КМ 22", model: "MAN Lion's Coach", capacityKg: 1400 },
      { plateNumber: "С77 АВ 22", model: "Scania Touring", capacityKg: 1100 },
    ],
  });

  const buses = await prisma.bus.findMany();
  const routes = await prisma.route.findMany({
    include: { originCity: true, destinationCity: true },
  });

  const routeBarnaulBiysk =
    routes.find(
      (r) => r.originCity.name === "Барнаул" && r.destinationCity.name === "Бийск"
    ) ?? routes[0];

  const trip = await prisma.busTrip.create({
    data: {
      busId: buses[0].id,
      routeId: routeBarnaulBiysk.id,
      scheduledDeparture: new Date(Date.now() + 6 * 60 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 10 * 60 * 60 * 1000),
    },
  });

  const shippedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const eta = new Date(shippedAt.getTime() + routeBarnaulBiysk.estimatedHours * 3600 * 1000);

  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber: "AV10293847",
      userId: demoClient.id,
      routeId: routeBarnaulBiysk.id,
      busTripId: trip.id,
      currentStatusId: stTransit.id,
      weightKg: 8.4,
      cargoType: "PARCEL",
      urgency: "EXPRESS",
      insurance: true,
      priceTotal: 2490,
      estimatedDeliveryAt: eta,
      shippedAt,
      recipientName: "Мария Соколова",
      recipientPhone: "+7 923 111-22-33",
    },
  });

  await prisma.trackingHistory.createMany({
    data: [
      {
        shipmentId: shipment.id,
        statusId: stCreated.id,
        locationCity: "Барнаул",
        note: "Оформлено в терминале",
        createdAt: shippedAt,
      },
      {
        shipmentId: shipment.id,
        statusId: stTransit.id,
        locationCity: "Новоалтайск",
        note: "Междугородний рейс",
        createdAt: new Date(shippedAt.getTime() + 3 * 3600 * 1000),
      },
    ],
  });

  await prisma.payment.create({
    data: {
      shipmentId: shipment.id,
      amount: shipment.priceTotal,
      method: "ONLINE",
      status: "PAID",
    },
  });

  const routeBarnaulRubtsovsk =
    routes.find(
      (r) => r.originCity.name === "Барнаул" && r.destinationCity.name === "Рубцовск"
    ) ?? routes[0];

  const tripRub = await prisma.busTrip.create({
    data: {
      busId: buses[1]!.id,
      routeId: routeBarnaulRubtsovsk.id,
      scheduledDeparture: new Date(Date.now() + 48 * 60 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 54 * 60 * 60 * 1000),
    },
  });

  const handedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const deliveredShippedAt = new Date(
    handedAt.getTime() - routeBarnaulRubtsovsk.estimatedHours * 3600 * 1000
  );

  const deliveredShipment = await prisma.shipment.create({
    data: {
      trackingNumber: "AV88776655",
      userId: demoClient.id,
      routeId: routeBarnaulRubtsovsk.id,
      busTripId: tripRub.id,
      currentStatusId: stDelivered.id,
      weightKg: 12,
      cargoType: "CARGO",
      urgency: "STANDARD",
      insurance: false,
      priceTotal: 4280,
      estimatedDeliveryAt: handedAt,
      shippedAt: deliveredShippedAt,
      recipientName: "ООО «Рубцовск-Трейд»",
      recipientPhone: "+7 385 333-44-55",
    },
  });

  await prisma.trackingHistory.createMany({
    data: [
      {
        shipmentId: deliveredShipment.id,
        statusId: stCreated.id,
        locationCity: "Барнаул",
        note: "Принято к перевозке",
        createdAt: deliveredShippedAt,
      },
      {
        shipmentId: deliveredShipment.id,
        statusId: stTransit.id,
        locationCity: "Алейск",
        note: "Транзит по маршруту",
        createdAt: new Date(deliveredShippedAt.getTime() + 4 * 3600 * 1000),
      },
      {
        shipmentId: deliveredShipment.id,
        statusId: stDelivered.id,
        locationCity: "Рубцовск",
        note: "Выдано получателю",
        createdAt: handedAt,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      shipmentId: deliveredShipment.id,
      amount: deliveredShipment.priceTotal,
      method: "CARD",
      status: "PAID",
    },
  });

  await prisma.review.createMany({
    data: [
      {
        authorName: "Ирина Волкова",
        rating: 5,
        comment: "Очень оперативно довезли партию образцов в Бийск, менеджер на связи.",
        published: true,
      },
      {
        authorName: "Сергей Романов",
        rating: 4,
        comment: "Удобно отслеживать на сайте, груз пришёл в срок.",
        published: true,
      },
      {
        authorName: "ООО «АлтайПак»",
        rating: 5,
        comment: "Регулярные рейсы Барнаул–Рубцовск, прозрачные сроки.",
        published: true,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: demoClient.id,
        type: "SHIPMENT",
        title: "Отправление в пути",
        body: `Трек-номер ${shipment.trackingNumber} следует по маршруту.`,
        read: false,
      },
      {
        userId: demoClient.id,
        type: "INFO",
        title: "Новые рейсы на выходные",
        body: "Добавлены дополнительные автобусные отправления Барнаул → Заринск.",
        read: true,
      },
    ],
  });

  await prisma.savedRoute.create({
    data: {
      userId: demoClient.id,
      routeId: routeBarnaulBiysk.id,
      label: "Частый маршрут",
    },
  });

  await prisma.favoriteAddress.create({
    data: {
      userId: demoClient.id,
      label: "Склад",
      city: "Бийск",
      addressLine: "ул. Владимира Ленина, 183",
    },
  });

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
