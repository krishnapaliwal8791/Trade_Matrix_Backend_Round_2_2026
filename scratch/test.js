const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { newsBundleService } = require('../dist/services/newsBundle.service.js');
const { AppError } = require('../dist/utils/AppError.js');

async function run() {
  try {
    const pendingBundle = await prisma.newsBundle.create({
      data: { title: 'Pending Bundle', status: 'PENDING' }
    });
    const activeBundle = await prisma.newsBundle.create({
      data: {
        title: 'Active Bundle', status: 'ACTIVE', releasedAt: new Date(),
        News: { create: { title: 'News 1', content: 'Content 1' } }
      }
    });
    const completedBundle = await prisma.newsBundle.create({
      data: { title: 'Completed Bundle', status: 'COMPLETED', releasedAt: new Date() }
    });

    console.log('--- Verifying ACTIVE ---');
    const act = await newsBundleService.getNewsBundle(activeBundle.id);
    console.log(act.title, 'accessible');
    
    if (act.BundlePrices !== undefined) {
        console.error('BundlePrices was returned!');
    }
    
    if (act.news && act.news.length === 1 && act.news[0].title === 'News 1') {
       console.log('News fields fetched properly');
    }

    console.log('--- Verifying COMPLETED ---');
    const comp = await newsBundleService.getNewsBundle(completedBundle.id);
    console.log(comp.title, 'accessible');

    console.log('--- Verifying PENDING ---');
    try {
        await newsBundleService.getNewsBundle(pendingBundle.id);
        console.error('FAILED: Pending bundle was accessible!');
    } catch (e) {
        if (e instanceof AppError && e.statusCode === 404 && e.code === 'NOT_FOUND_ERROR') {
            console.log('SUCCESS: Pending bundle returned 404 NOT_FOUND_ERROR');
        } else {
            console.error('FAILED: Unexpected error for pending bundle:', e);
        }
    }

    console.log('--- Verifying Non-existent ---');
    try {
        await newsBundleService.getNewsBundle('non-existent-id');
        console.error('FAILED: Non-existent bundle was accessible!');
    } catch (e) {
        if (e instanceof AppError && e.statusCode === 404 && e.code === 'NOT_FOUND_ERROR') {
            console.log('SUCCESS: Non-existent bundle returned 404 NOT_FOUND_ERROR');
        } else {
            console.error('FAILED: Unexpected error for non-existent bundle:', e);
        }
    }

  } finally {
    await prisma.newsBundle.deleteMany({
      where: { title: { in: ['Pending Bundle', 'Active Bundle', 'Completed Bundle'] } }
    });
  }
}

run().catch(console.error);
