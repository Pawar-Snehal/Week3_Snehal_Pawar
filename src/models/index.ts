import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('postgres://postgres:snehal@localhost:5432/weatherdb');

export default sequelize;
