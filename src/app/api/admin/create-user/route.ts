import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "La variable SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email, password, fullName, role = "user" } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña temporal son requeridos." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña temporal debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // Crear usuario mediante la API de administración de Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar correo automáticamente
      user_metadata: {
        full_name: fullName || "",
        role: role,
        must_change_password: true,
      },
    });

    if (authError) {
      console.error("Error creando usuario en Auth:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Asegurar que el registro en public.profiles quede actualizado con las banderas
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || "",
      role: role,
      must_change_password: true,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: authData.user.email,
        role: role,
        mustChangePassword: true,
      },
    });
  } catch (error: any) {
    console.error("Error en /api/admin/create-user:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear usuario" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY no configurada." },
        { status: 500 }
      );
    }

    // Obtener lista de perfiles
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profiles });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al consultar usuarios" },
      { status: 500 }
    );
  }
}
