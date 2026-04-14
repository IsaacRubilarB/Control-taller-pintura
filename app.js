// --- NAVEGACIÓN DE PESTAÑAS ---
function cambiarPestaña(idPestaña) {
    document.querySelectorAll('.tab-content').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(idPestaña).style.display = 'block';

    if (idPestaña === 'p-historial') cargarHistorial('todas');
    
    // --- NUEVO: Cargar tabla HH al entrar ---
    if (idPestaña === 'p-hh') cargarTablaHH();
}

// --- GESTIÓN DE PERSONAL ---

function agregarPersona() {
    const nombre = document.getElementById('nombreEspecialista').value;
    const rol = document.getElementById('rolEspecialista').value;

    if (nombre.trim() === "") {
        alert("Por favor, ingresa un nombre.");
        return;
    }

    const nuevaPersonaRef = db.ref('especialistas').push();
    nuevaPersonaRef.set({
        nombre: nombre,
        rol: rol,
        estado: "Disponible" 
    }).then(() => {
        document.getElementById('nombreEspecialista').value = "";
    }).catch((error) => console.error("Error al guardar: ", error));
}

// Lectura de personal con agrupación por Rol y Orden por Apellido
db.ref('especialistas').on('value', (snapshot) => {
    const contenedor = document.getElementById('listaPersonas');
    contenedor.innerHTML = ""; 

    if (snapshot.exists()) {
        let personal = [];
        snapshot.forEach((childSnapshot) => {
            personal.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        personal.sort((a, b) => {
            const apellidoA = a.nombre.split(" ").pop().toLowerCase();
            const apellidoB = b.nombre.split(" ").pop().toLowerCase();
            return apellidoA.localeCompare(apellidoB);
        });

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

// --- GESTIÓN DE TAREAS ACTIVAS ---

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
        
        // --- NUEVO: Redirección automática ---
        cambiarPestaña('p-dashboard'); 
    }).catch((error) => {
        console.error("Error al crear tarea: ", error);
    });
}

db.ref('tareas').on('value', (snapshot) => {
    const contenedor = document.getElementById('gridTareas');
    contenedor.innerHTML = ""; 

    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const tarea = childSnapshot.val();
            const idTarea = childSnapshot.key;
            
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
                    <div class="card-actions">
                        <button class="btn-asignar" onclick="prepararAsignacion('${idTarea}')">+ Personal</button>
                        <button class="btn-finalizar" onclick="finalizarTarea('${idTarea}')">Finalizar</button>
                        <button class="btn-eliminar" onclick="eliminarTarea('${idTarea}')">Eliminar</button>
                    </div>
                </div>
            `;
        });
    } else {
        contenedor.innerHTML = "<p>No hay tareas activas en el taller.</p>";
    }
});

// --- LÓGICA DE ASIGNACIÓN ---

let tareaSeleccionadaId = ""; 

function prepararAsignacion(idTarea) {
    tareaSeleccionadaId = idTarea;
    document.getElementById('modalAsignar').style.display = 'flex';
    const select = document.getElementById('selectEspecialistas');
    select.innerHTML = ""; 

    db.ref('especialistas').once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const esp = child.val();
            select.innerHTML += `<option value="${child.key}">${esp.nombre} (${esp.rol})</option>`;
        });
    });
}

function cerrarModal() {
    document.getElementById('modalAsignar').style.display = 'none';
}

function confirmarAsignacion() {
    const sel = document.getElementById('selectEspecialistas');
    const idEspecialista = sel.value;
    const nombreEspecialista = sel.options[sel.selectedIndex].text;

    if (!idEspecialista) return;

    db.ref('tareas/' + tareaSeleccionadaId + '/asignados').push({
        idEspecialista: idEspecialista,
        nombre: nombreEspecialista,
        fechaAsignacion: Date.now()
    }).then(() => {
        db.ref('tareas/' + tareaSeleccionadaId).update({ estado: "En Proceso" });
        db.ref('especialistas/' + idEspecialista).update({ estado: "Ocupado" });
        cerrarModal();
    });
}

// --- CIERRE Y ELIMINACIÓN ---

function eliminarTarea(id) {
    if (confirm("¿Estás seguro de eliminar esta tarea? El personal asignado volverá a estar Disponible.")) {
        db.ref('tareas/' + id).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const tarea = snapshot.val();
                if (tarea.asignados) {
                    Object.values(tarea.asignados).forEach(asig => {
                        db.ref('especialistas/' + asig.idEspecialista).update({ estado: "Disponible" });
                    });
                }
                db.ref('tareas/' + id).remove();
            }
        });
    }
}

function finalizarTarea(id) {
    if (confirm("¿Finalizar esta tarea? Se guardará en el historial y el personal quedará disponible.")) {
        db.ref('tareas/' + id).once('value', (snapshot) => {
            const datosTarea = snapshot.val();
            db.ref('historial').push({
                ...datosTarea,
                fechaCierre: Date.now(),
                estado: "Finalizado"
            }).then(() => {
                if (datosTarea.asignados) {
                    Object.values(datosTarea.asignados).forEach(asig => {
                        db.ref('especialistas/' + asig.idEspecialista).update({ estado: "Disponible" });
                    });
                }
                db.ref('tareas/' + id).remove();
            });
        });
    }
}

// --- HISTORIAL Y PROCESOS ---

function cargarHistorial(filtro = 'todas') {
    const contenedor = document.getElementById('listaHistorial');
    contenedor.innerHTML = "<p>Cargando registros...</p>";

    Promise.all([
        db.ref('tareas').once('value'),
        db.ref('historial').once('value')
    ]).then((snapshots) => {
        let todas = [];
        if (snapshots[0].exists()) {
            snapshots[0].forEach(c => { todas.push({ id: c.key, ...c.val(), tipo: 'activas' }); });
        }
        if (snapshots[1].exists()) {
            snapshots[1].forEach(c => { todas.push({ id: c.key, ...c.val(), tipo: 'cerradas' }); });
        }

        const filtradas = filtro === 'todas' ? todas : todas.filter(t => t.tipo === filtro);
        contenedor.innerHTML = "";

        if (filtradas.length === 0) {
            contenedor.innerHTML = "<p>No hay registros para mostrar.</p>";
            return;
        }

        filtradas.forEach(tarea => {
            let personalList = "";
            if (tarea.asignados) {
                Object.values(tarea.asignados).forEach(a => { personalList += `<li>${a.nombre}</li>`; });
            } else {
                personalList = "<li>Sin personal asignado</li>";
            }

            contenedor.innerHTML += `
                <div class="tarea-card-historial ${tarea.tipo}" onclick="toggleDetalle('${tarea.id}')">
                    <div class="header-historial">
                        <strong>OT: ${tarea.ot} | OP: ${tarea.op}</strong>
                        <span class="badge-tipo">${tarea.tipo}</span>
                    </div>
                    <p>${tarea.descripcion}</p>
                    <div id="detalle-${tarea.id}" class="detalle-personal" style="display:none;">
                        <hr>
                        <strong>Especialistas involucrados:</strong>
                        <ul>${personalList}</ul>
                        <small>Cierre: ${tarea.fechaCierre ? new Date(tarea.fechaCierre).toLocaleString() : 'N/A'}</small>
                    </div>
                </div>
            `;
        });
    });
}

function toggleDetalle(id) {
    const div = document.getElementById(`detalle-${id}`);
    if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none';
}

function mostrarNotificacion(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerText = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000); // Desaparece en 3 segundos
}




function cargarTablaHH() {
    const cuerpo = document.getElementById('tablaCuerpoHH');
    const fechaDiv = document.getElementById('fechaHoy');
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD para la DB
    const esViernes = hoy.getDay() === 5;
    const metaReales = esViernes ? 3.5 : 4.5;

    fechaDiv.innerText = hoy.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Traemos especialistas y tareas al mismo tiempo para cruzar info
    Promise.all([
        db.ref('especialistas').once('value'),
        db.ref('tareas').once('value')
    ]).then((snapshots) => {
        const especialistas = snapshots[0];
        const tareasActivas = snapshots[1].val() || {};
        
        cuerpo.innerHTML = "";
        
        especialistas.forEach((espSnap) => {
            const id = espSnap.key;
            const esp = espSnap.val();

            // LÓGICA: ¿Tiene tarea asignada en el Panel de Control?
            let otAuto = "";
            let opAuto = "";
            
            Object.values(tareasActivas).forEach(tarea => {
                if (tarea.asignados) {
                    Object.values(tarea.asignados).forEach(asig => {
                        if (asig.idEspecialista === id) {
                            otAuto = tarea.ot;
                            opAuto = tarea.op;
                        }
                    });
                }
            });

            // Creamos la fila base
            cuerpo.innerHTML += `
                <tr id="row-hh-${id}">
                    <td class="col-nombre-tecnico">
                        <strong>${esp.nombre}</strong><br>
                        <button class="btn-add-ot" onclick="agregarFilaOT('${id}', ${metaReales})">+ OT/OP</button>
                    </td>
                    <td id="container-reales-${id}">
                        <div class="row-ot-input">
                            <input type="text" placeholder="OT" class="ot-val" value="${otAuto}">
                            <input type="text" placeholder="OP" class="op-val" value="${opAuto}">
                            <input type="number" step="0.1" class="hrs-val" value="${metaReales}" oninput="sumarSoloReales('${id}', ${metaReales})">
                        </div>
                    </td>
                    <td id="total-reales-${id}" class="total-reales-cell meta-ok">${metaReales.toFixed(1)}</td>
                    <td><button class="btn-mini-save" onclick="guardarFilaUnica('${id}')">💾</button></td>
                </tr>`;

            // VERIFICACIÓN DE BLOQUEO: Consultar si ya guardó hoy
            db.ref(`asistencia_hh/${hoyStr}/${id}`).once('value', (savedSnap) => {
                if (savedSnap.exists() && savedSnap.val().finalizado) {
                    bloquearFila(id);
                }
            });
        });
    }).catch(err => {
        console.error("Error cargando HH:", err);
        cuerpo.innerHTML = "<tr><td colspan='4'>Error al conectar con la base de datos.</td></tr>";
    });
}

function sumarSoloReales(idEsp, meta) {
    let suma = 0;
    document.querySelectorAll(`#container-reales-${idEsp} .hrs-val`).forEach(i => suma += parseFloat(i.value || 0));
    const cell = document.getElementById(`total-reales-${idEsp}`);
    cell.innerText = suma.toFixed(1);
    cell.className = (parseFloat(suma.toFixed(1)) === meta) ? "total-reales-cell meta-ok" : "total-reales-cell meta-pendiente";
}

function agregarFilaOT(idEsp, meta) {
    const contenedor = document.getElementById(`container-reales-${idEsp}`);
    const div = document.createElement('div');
    div.className = 'row-ot-input';
    div.innerHTML = `<input type="text" placeholder="OT" class="ot-val"><input type="text" placeholder="OP" class="op-val"><input type="number" step="0.1" class="hrs-val" value="0" oninput="sumarSoloReales('${idEsp}', ${meta})"><button onclick="this.parentElement.remove(); sumarSoloReales('${idEsp}', ${meta})" style="border:none; background:none; color:red; cursor:pointer;">×</button>`;
    contenedor.appendChild(div);
}

function guardarFilaUnica(idEsp) {
    const hoyStr = new Date().toISOString().split('T')[0];
    const desglose = [];
    document.querySelectorAll(`#container-reales-${idEsp} .row-ot-input`).forEach(row => {
        desglose.push({
            ot: row.querySelector('.ot-val').value,
            op: row.querySelector('.op-val').value,
            hrs: parseFloat(row.querySelector('.hrs-val').value || 0)
        });
    });

    db.ref(`asistencia_hh/${hoyStr}/${idEsp}`).set({ desglose, fechaRegistro: Date.now() })
    .then(() => alert("Especialista guardado"));
}

function guardarTodoElDia() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const promesas = [];
    
    // Buscamos todas las filas que empiezan con row-hh-
    document.querySelectorAll('tr[id^="row-hh-"]').forEach(tr => {
        const idEsp = tr.id.replace('row-hh-', '');
        const desglose = [];
        tr.querySelectorAll('.row-ot-input').forEach(row => {
            desglose.push({
                ot: row.querySelector('.ot-val').value,
                op: row.querySelector('.op-val').value,
                hrs: parseFloat(row.querySelector('.hrs-val').value || 0)
            });
        });
        promesas.push(db.ref(`asistencia_hh/${hoyStr}/${idEsp}`).set({ desglose, fechaRegistro: Date.now() }));
    });

    Promise.all(promesas).then(() => alert("¡Jornada completa guardada!"));
}
// Ejecutar al cargar la página por primera vez
document.addEventListener('DOMContentLoaded', () => {
    // Esto asegura que si refrescas, se limpie la vista o cargue la pestaña por defecto
    cambiarPestaña('p-especialistas'); 
});

// --- GUARDADO DE HH ---
async function guardarFilaUnica(idEsp) {
    const hoy = new Date();
    const esViernes = hoy.getDay() === 5;
    const meta = esViernes ? 3.5 : 4.5;
    const totalActual = parseFloat(document.getElementById(`total-reales-${idEsp}`).innerText);
    const nombre = document.querySelector(`#row-hh-${idEsp} strong`).innerText;

    // 1. Preguntar si está seguro
    const confirmacion = await Swal.fire({
        title: `¿Confirmar HH de ${nombre}?`,
        text: `Total actual: ${totalActual} hrs`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1abc9c',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Revisar'
    });

    if (!confirmacion.isConfirmed) return;

    // 2. Lógica de horas faltantes
    if (totalActual < meta) {
        const faltantes = (meta - totalActual).toFixed(1);
        const pnpConfirm = await Swal.fire({
            title: 'Horas faltantes detectadas',
            text: `A ${nombre} le faltan ${faltantes} hrs para completar la jornada. ¿Asignar el resto a PNP (Paro No Programado)?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, asignar a PNP',
            cancelButtonText: 'No, completar después'
        });

        if (pnpConfirm.isConfirmed) {
            // Agregamos una fila de PNP automática para completar la meta
            agregarFilaPNPAuto(idEsp, faltantes);
            // Re-ejecutamos la suma para que el total suba a la meta
            sumarSoloReales(idEsp, meta);
        } else {
            return; // No guarda si el usuario decide completar después
        }
    }

    // 3. Proceder al guardado en Firebase
    ejecutarGuardadoFirebase(idEsp, nombre);
}

function agregarFilaPNPAuto(idEsp, hrs) {
    const contenedor = document.getElementById(`container-reales-${idEsp}`);
    const div = document.createElement('div');
    div.className = 'row-ot-input pnp-row'; // Clase extra para identificarlo
    div.innerHTML = `
        <input type="text" class="ot-val" value="PNP" readonly>
        <input type="text" class="op-val" value="99" readonly>
        <input type="number" class="hrs-val" value="${hrs}" readonly>
    `;
    contenedor.appendChild(div);
}

function ejecutarGuardadoFirebase(idEsp, nombre) {
    const hoyStr = new Date().toISOString().split('T')[0];
    const desglose = [];
    
    document.querySelectorAll(`#container-reales-${idEsp} .row-ot-input`).forEach(row => {
        desglose.push({
            ot: row.querySelector('.ot-val').value,
            op: row.querySelector('.op-val').value,
            hrs: parseFloat(row.querySelector('.hrs-val').value || 0)
        });
    });

    db.ref(`asistencia_hh/${hoyStr}/${idEsp}`).set({
        nombre: nombre,
        desglose: desglose,
        fechaRegistro: Date.now(),
        finalizado: true // Marcamos como bloqueado
    }).then(() => {
        Swal.fire('¡Guardado!', `La jornada de ${nombre} se registró con éxito.`, 'success');
        bloquearFila(idEsp);
    });
}

function bloquearFila(idEsp) {
    const fila = document.getElementById(`row-hh-${idEsp}`);
    fila.style.opacity = "0.6";
    fila.style.pointerEvents = "none";
    fila.style.backgroundColor = "#f8f9fa";
    const btn = fila.querySelector('.btn-mini-save');
    btn.innerHTML = "✅";
}