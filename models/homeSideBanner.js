const mongoose = require("mongoose");

const homeSideBannersSchema = mongoose.Schema({
  images: [
    {
      type: String,
      required: true,
    },
  ],
  catId: {
    type: String,
  },
  catName: {
    type: String,
  },
  subCatId:{
    type: String,
  },
  subCatName:{
    type: String,
  },
  link: {
      type: String,
  },
  display: {
    type: Boolean,
    default: "true",
}
});

homeSideBannersSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

homeSideBannersSchema.set("toJSON", {
  virtuals: true,
});

exports.HomeSideBanners = mongoose.model("HomeSideBanners", homeSideBannersSchema);
exports.homeSideBannersSchema = homeSideBannersSchema;
