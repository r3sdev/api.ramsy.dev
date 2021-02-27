import 'dotenv/config';
import { createAuth } from '@keystone-next/auth';
import { config, createSchema } from '@keystone-next/keystone/schema';
import {
  withItemData,
  statelessSessions,
} from '@keystone-next/keystone/session';
import { User } from './schemas/User';
import { Role } from './schemas/Role';
import { CapCode } from './schemas/CapCode';
import { Province } from './schemas/Province';
import { SafetyRegion } from './schemas/SafetyRegion';
import { insertSeedData } from './seed-data';
import { sendPasswordResetEmail } from './mail';
import { permissionsList } from './schemas/fields';

const databaseURL = process.env.DATABASE_URL || 'mongodb://localhost/keystone';

const sessionConfig = {
  maxAge: 60 * 60 * 24 * 360,
  secret: process.env.COOKIE_SECRET || 'secret_not_set',
};

const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  secretField: 'password',
  initFirstItem: {
    fields: ['name', 'email', 'password'],
    // TODO: Add in initial roles
  },
  passwordResetLink: {
    async sendToken(args) {
      // send the email
      await sendPasswordResetEmail(args.token, args.identity);
    },
  },
});

export default withAuth(
  config({
    server: {
      cors: {
        origin: [process.env.FRONTEND_URL],
        credentials: true,
      },
    },
    db: {
      adapter: 'mongoose',
      url: databaseURL,
      // TODO: Add data seeding here
      async onConnect(keystone) {
        console.log('✨ Connected to the Database');
        if (process.argv.includes('--seed-data')) {
          await insertSeedData(keystone);
        }
      },
    },
    lists: createSchema({
      // Schema items go in here
      User,
      Role,
      CapCode,
      Province,
      SafetyRegion
    }),
    // extendGraphqlSchema,
    ui: {
      // Show the UI only for people who pass this test
      isAccessAllowed: ({ session }): boolean => session?.data,
    },
    session: withItemData(statelessSessions(sessionConfig), {
      // GraphQL query
      User: `
      id
      name
      email
      role {
        ${permissionsList.join(' ')}
      }
    `,
    }),
  })
);
