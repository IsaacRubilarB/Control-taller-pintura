// --- NAVEGACIÓN DE PESTAÑAS ---
function cambiarPestaña(idPestaña) {
    document.querySelectorAll('.tab-content').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(idPestaña).style.display = 'block';
}

// --- GESTIÓN DE PERSONAL ---

// 1. Función para guardar en Firebase
function agregarPersona() {
    const nombre = document.getElementById('nombreEspecialista').value;
    const rol = document.getElementById('rolEspecialista').value;

    if (nombre.trim() === "") {
        alert("Por favor, ingresa un nombre.");
        return;
    }

    // Guardamos en la carpeta "especialistas" de la base de datos
    const nuevaPersonaRef = db.ref('especialistas').push();
    nuevaPersonaRef.set({
        nombre: nombre,
        rol: rol,
        estado: "Disponible" 
    }).then(() => {
        // Limpiamos el input después de guardar
        document.getElementById('nombreEspecialista').value = "";
        console.log("Persona agregada con éxito");
    }).catch((error) => {
        console.error("Error al guardar: ", error);
    });
}

// 2. Función para LEER el personal en tiempo real
// --- LEER EL PERSONAL ORDENADO POR ROL Y APELLIDO (CON ESTADOS ACTUALIZADOS) ---
db.ref('especialistas').on('value', (snapshot) => {
    const contenedor = document.getElementById('listaPersonas');
    contenedor.innerHTML = ""; 

    if (snapshot.exists()) {
        let personal = [];
        snapshot.forEach((childSnapshot) => {
            personal.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        // Ordenar por apellido (última palabra)
        personal.sort((a, b) => {
            const apellidoA = a.nombre.split(" ").pop().toLowerCase();
            const apellidoB = b.nombre.split(" ").pop().toLowerCase();
            return apellidoA.localeCompare(apellidoB);
        });

        // Configuración de grupos para los títulos
        const rolesConfig = [
            { id: "Supervisor", titulo: "Supervisores" },
            { id: "Mecanico sistemas", titulo: "Mecánicos de Sistemas" },
            { id: "Inspector", titulo: "Inspectores" },
            { id: "Pintor", titulo: "Pintores" },
            { id: "ETA", titulo: "Personal ETA" },
            { id: "Logístico", titulo: "Logística" }
        ];
        
        rolesConfig.forEach(rolObj => {
            const personalPorRol = personal.filter(p => p.rol.toLowerCase().includes(rolObj.id.toLowerCase()));
            
            if (personalPorRol.length > 0) {
                contenedor.innerHTML += `<h3 style="grid-column: 1 / -1; margin-top: 20px; border-bottom: 2px solid #eee;">${rolObj.titulo}</h3>`;
                
                personalPorRol.forEach(persona => {
    // Definimos las clases según el estado exacto de la base de datos
    const esOcupado = (persona.estado === "Ocupado");
    const claseCard = esOcupado ? "persona-card ocupado" : "persona-card";
    const claseBadge = esOcupado ? "badge ocupado" : "badge";

    contenedor.innerHTML += `
        <div class="${claseCard}">
            <div>
                <strong>${persona.nombre}</strong><br>
                <small>${persona.rol}</small>
            </div>
            <span class="${claseBadge}">${persona.estado}</span>
        </div>
    `;
});
            }
        });
    } else {
        contenedor.innerHTML = "<p>No hay personal registrado aún.</p>";
    }
});

// --- GESTIÓN DE TAREAS ---

function crearTarea() {
    const ot = document.getElementById('otNumber').value;
    const op = document.getElementById('opNumber').value;
    const descripcion = document.getElementById('tareaDesc').value;

    if (ot.trim() === "" || op.trim() === "") {
        alert("La OT y la OP son obligatorias.");
        return;
    }

    const nuevaTareaRef = db.ref('tareas').push();
    nuevaTareaRef.set({
        ot: ot,
        op: op,
        descripcion: descripcion,
        estado: "Pendiente",
        fechaCreacion: Date.now() 
    }).then(() => {
        // Limpiamos los campos
        document.getElementById('otNumber').value = "";
        document.getElementById('opNumber').value = "";
        document.getElementById('tareaDesc').value = "";
        alert("Tarea creada exitosamente");
    }).catch((error) => {
        console.error("Error al crear tarea: ", error);
    });
}

// --- LEER TAREAS EN TIEMPO REAL (DASHBOARD) ---


// --- LEER TAREAS Y SUS ASIGNADOS (DASHBOARD) ---
db.ref('tareas').on('value', (snapshot) => {
    const contenedor = document.getElementById('gridTareas');
    contenedor.innerHTML = ""; 

    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const tarea = childSnapshot.val();
            const idTarea = childSnapshot.key;
            
            // Creamos el HTML de los asignados si existen
            let listaAsignadosHTML = "";
            if (tarea.asignados) {
                Object.values(tarea.asignados).forEach(asig => {
                    listaAsignadosHTML += `<span class="badge-persona">${asig.nombre}</span> `;
                });
            } else {
                listaAsignadosHTML = "<em>Sin personal asignado</em>";
            }

            contenedor.innerHTML += `
                <div class="tarea-card">
                    <div class="card-header">
                        <span class="status-tag">${tarea.estado}</span>
                        <h3>OT: ${tarea.ot}</h3>
                        <small>OP: ${tarea.op}</small>
                    </div>
                    <p class="desc">${tarea.descripcion}</p>
                    <div class="asignados-box">
                        <strong>Especialistas:</strong><br>
                        ${listaAsignadosHTML}
                    </div>
                    <button class="btn-asignar" onclick="prepararAsignacion('${idTarea}')">
                        + Asignar Personal
                    </button>
                </div>
            `;
        });
    } else {
        contenedor.innerHTML = "<p>No hay tareas registradas.</p>";
    }
});


let tareaSeleccionadaId = ""; // Variable global para saber a qué tarea asignar

function prepararAsignacion(idTarea) {
    tareaSeleccionadaId = idTarea;
    document.getElementById('modalAsignar').style.display = 'flex';
    
    // Llenar el select con los especialistas de la DB
    const select = document.getElementById('selectEspecialistas');
    select.innerHTML = ""; // Limpiar

    db.ref('especialistas').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const esp = child.val();
            const idEsp = child.key;
            select.innerHTML += `<option value="${idEsp}">${esp.nombre} (${esp.rol})</option>`;
        });
    });
}

function cerrarModal() {
    document.getElementById('modalAsignar').style.display = 'none';
}

function confirmarAsignacion() {
    const idEspecialista = document.getElementById('selectEspecialistas').value;
    const nombreEspecialista = document.getElementById('selectEspecialistas').options[document.getElementById('selectEspecialistas').selectedIndex].text;

    if (!idEspecialista) return;

    // 1. Guardar la asignación en la tarea
    db.ref('tareas/' + tareaSeleccionadaId + '/asignados').push({
        idEspecialista: idEspecialista,
        nombre: nombreEspecialista,
        fechaAsignacion: Date.now()
    }).then(() => {
        // 2. Cambiar estado de la Tarea a "En Proceso"
        db.ref('tareas/' + tareaSeleccionadaId).update({ estado: "En Proceso" });

        // 3. CAMBIAR ESTADO DEL ESPECIALISTA A "OCUPADO"
        db.ref('especialistas/' + idEspecialista).update({
            estado: "Ocupado"
        });

        cerrarModal();
    });
}