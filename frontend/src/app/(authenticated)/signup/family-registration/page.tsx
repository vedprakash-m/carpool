import React from "react";
import { Metadata } from "next";
import FamilyRegistrationForm from "./FamilyRegistrationForm";

export const metadata: Metadata = {
  title: "Family Registration - VCarpool",
  description: "Register your family for VCarpool with comprehensive setup",
};

export default function FamilyRegistrationPage() {
  return <FamilyRegistrationForm />;
}
