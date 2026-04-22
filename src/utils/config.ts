const SITE_SETTINGS = {
  email: {
    type: 'smtp',
    host: 'smtp.gmail.com',
    secure: true,
    port: 465,
    tls: {
      rejectUnauthorized: false,
    },
    auth: {
      user: 'testing.combatsolution@gmail.com',
      pass: 'jpvmspsshgexuewy',
    },
  },
  fromMail: 'testing.combatsolution@gmail.com',
};
export default SITE_SETTINGS;
