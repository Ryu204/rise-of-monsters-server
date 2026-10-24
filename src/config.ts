export const USER_CONFIG = {
  maxNameLength: 256,
  minNameLength: 1,
  maxUsernameLength: 256,
  minUsernameLength: 6,
  minPasswordLength: 8,
  maxPasswordLength: 256,
};

export const IS_PROD = process.env.NODE_ENV == "production";
