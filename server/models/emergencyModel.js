const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Emergency = sequelize.define(
  "Emergency",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    patientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    condition: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    severity: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    needsICU: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    needsVentilator: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: "Pending",
    },

    hospitalHistory: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      defaultValue: "[]",

      get() {
        const value = this.getDataValue("hospitalHistory");

        if (!value) {
          return [];
        }

        try {
          return JSON.parse(value);
        } catch (error) {
          return [];
        }
      },

      set(value) {
        this.setDataValue(
          "hospitalHistory",
          typeof value === "string"
            ? value
            : JSON.stringify(value || [])
        );
      },
    },
  },
  {
    tableName: "emergency_requests",
    timestamps: true,
  }
);

module.exports = Emergency;