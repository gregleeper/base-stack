#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting attendance statuses seeding process...${NC}"

# Check if pnpm is the package manager
if command -v pnpm &> /dev/null; then
  echo -e "${BLUE}Using pnpm to run the script...${NC}"
  cd "$(dirname "$0")/../.." && pnpm tsx prisma/scripts/seed-attendance-statuses.ts
else
  # Fallback to npm or node directly
  if command -v npx &> /dev/null; then
    echo -e "${BLUE}Using npx to run the script...${NC}"
    cd "$(dirname "$0")/../.." && npx tsx prisma/scripts/seed-attendance-statuses.ts
  else
    echo -e "${RED}Error: Neither pnpm nor npx found. Please install pnpm or npm.${NC}"
    exit 1
  fi
fi

# Check if the script was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Attendance statuses seeding completed successfully!${NC}"
else
  echo -e "${RED}Attendance statuses seeding failed.${NC}"
  exit 1
fi