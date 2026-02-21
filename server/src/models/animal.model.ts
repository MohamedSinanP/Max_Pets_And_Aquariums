import { Schema, model, Document, Types } from "mongoose";

export type HealthStatus = "healthy" | "under_treatment" | "quarantine";
export type AgeUnit = "days" | "weeks" | "months" | "years";
export type Gender = "male" | "female" | "unknown";

export interface IVaccination {
  name: string;
  date: Date;
  nextDue?: Date;
  administeredBy?: string;
  notes?: string;
}

export interface IAnimal extends Document {
  // 1-to-1 link back to Product — this is the bridge between stock and biology
  product: Types.ObjectId;
  species: string;
  breed?: string;
  age: {
    value: number;
    unit: AgeUnit;
  };
  gender: Gender;
  color?: string;
  weight?: number; // in kg
  healthStatus: HealthStatus;
  vaccinations: IVaccination[];
  origin?: string;      // country or breeder name
  microchipId?: string;
  dietaryNotes?: string;
  behaviorNotes?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VaccinationSchema = new Schema<IVaccination>(
  {
    name: {
      type: String,
      required: [true, "Vaccine name is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Vaccination date is required"],
    },
    nextDue: {
      type: Date,
      default: null,
    },
    administeredBy: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: true } // Keep IDs for vaccinations so they can be individually updated/deleted
);

const AnimalSchema = new Schema<IAnimal>(
  {
    // → Product model (1-to-1)
    // Every Animal document is the extended biological profile of one Product
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
      unique: true, // Enforces the 1-to-1 relationship at DB level
    },

    species: {
      type: String,
      required: [true, "Species is required"],
      trim: true,
      // e.g. "Psittacus erithacus", "Golden Retriever", "Betta splendens"
    },

    breed: {
      type: String,
      trim: true,
      default: null,
      // e.g. "Labrador", "Persian" — optional, not all animals have breeds
    },

    age: {
      value: {
        type: Number,
        required: [true, "Age value is required"],
        min: [0, "Age cannot be negative"],
      },
      unit: {
        type: String,
        enum: ["days", "weeks", "months", "years"],
        required: [true, "Age unit is required"],
      },
    },

    gender: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },

    color: {
      type: String,
      trim: true,
      default: null,
    },

    // Weight in kilograms
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
      default: null,
    },

    healthStatus: {
      type: String,
      enum: ["healthy", "under_treatment", "quarantine"],
      default: "healthy",
    },

    // Full vaccination history — each entry is individually tracked
    vaccinations: {
      type: [VaccinationSchema],
      default: [],
    },

    origin: {
      type: String,
      trim: true,
      default: null, // e.g. "Brazil", "Local Breeder - Ahmed Farms"
    },

    microchipId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null values (not all animals are chipped)
      default: null,
    },

    dietaryNotes: {
      type: String,
      trim: true,
      default: null, // e.g. "Allergic to sunflower seeds"
    },

    behaviorNotes: {
      type: String,
      trim: true,
      default: null, // e.g. "Bites strangers, friendly with children"
    },

    notes: {
      type: String,
      trim: true,
      default: null, // General notes
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: upcoming vaccinations due in the next 30 days
AnimalSchema.virtual("upcomingVaccinations").get(function () {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return this.vaccinations.filter(
    (v) => v.nextDue && v.nextDue >= now && v.nextDue <= in30Days
  );
});

AnimalSchema.index({ product: 1 }); // Fast lookup by product
AnimalSchema.index({ healthStatus: 1 });
AnimalSchema.index({ species: 1 });
AnimalSchema.index({ microchipId: 1 });

export const Animal = model<IAnimal>("Animal", AnimalSchema);