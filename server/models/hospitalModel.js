
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Hospital = sequelize.define(
    "Hospital",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        hospitalName: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },

        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        // Coordinates used to calculate distance from the patient
        latitude: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },

        longitude: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },

        icuBeds: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },

        generalBeds: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },

        ventilators: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },

        trafficLevel: {
            type: DataTypes.ENUM("Low", "Medium", "High"),
            defaultValue: "Low",
        },

        status: {
            type: DataTypes.ENUM("Active", "Inactive"),
            defaultValue: "Active",
        },
    },
    {
        tableName: "hospitals",
        timestamps: false,
    }
);

module.exports = Hospital;
