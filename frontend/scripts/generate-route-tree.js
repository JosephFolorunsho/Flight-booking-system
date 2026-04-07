#!/usr/bin/env node

const { generateRouteTree } = require('@tanstack/router-cli');

async function generate() {
  try {
    await generateRouteTree({
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
      quoteStyle: 'single',
      semicolons: true,
    });
    console.log('Route tree generated successfully!');
  } catch (error) {
    console.error('Error generating route tree:', error);
    process.exit(1);
  }
}

generate();