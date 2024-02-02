'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      
    }
    static completedItems(userId) {
      return this.findAll({
        where: {
          completed: true,
          userId,
        },
      
        order: [["id", "ASC"]],
      });
    }
    setCompletionStatus(value) {
      return this.update({ completed: value });
    }
  }
  Enrollment.init({
    userId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER,
    chapterId: DataTypes.INTEGER,
    pageId: DataTypes.INTEGER,
    completed: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Enrollment',
  });
  return Enrollment;
};