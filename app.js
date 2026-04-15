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
            { id: "Mecanico sistemas", titulo: "Mecánicos de sistemas" },
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
    const modelo = document.getElementById('modeloAvion').value;
    const numAvion = document.getElementById('numAvion').value;
    const desc = document.getElementById('tareaDesc').value;

    // Validación básica
    if (!ot || !op || !modelo || !numAvion) {
        Swal.fire('Campos incompletos', 'Por favor, completa los datos del avión y la orden.', 'warning');
        return;
    }

    const nuevaTarea = {
        ot: ot,
        op: op,
        modeloAvion: modelo,
        numAvion: numAvion,
        descripcion: desc,
        estado: 'Activa',
        fechaCreacion: Date.now()
    };

    // Guardar en Firebase
    db.ref('tareas').push(nuevaTarea).then(() => {
        Swal.fire('Tarea Creada', `La OT ${ot} para el ${modelo} #${numAvion} ha sido registrada.`, 'success');
        
        // Limpiar formulario
        document.getElementById('otNumber').value = "";
        document.getElementById('opNumber').value = "";
        document.getElementById('modeloAvion').value = "";
        document.getElementById('numAvion').value = "";
        document.getElementById('tareaDesc').value = "";
        
        // Opcional: Cambiar a la pestaña de Dashboard para ver la nueva tarea
        cambiarPestaña('p-dashboard');
    }).catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo crear la tarea.', 'error');
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

           // Busca el forEach de tareas en tu app.js y actualiza el innerHTML:
   
// --- REEMPLAZA TU CONTENEDOR.INNERHTML POR ESTE ---
contenedor.innerHTML += `
    <div class="tarea-card">
        <div class="card-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <small class="tag-avion" style="color: var(--verde-enaer); font-weight: bold; text-transform: uppercase; background: #e8f5e9; padding: 2px 8px; border-radius: 4px;">
                    ✈️ ${tarea.modeloAvion} | cola: ${tarea.numAvion}
                </small>
                <span class="status-tag">${tarea.estado}</span>
            </div>
            
            <h3 style="margin: 0; color: #2c3e50;">OT: ${tarea.ot}</h3>
            <p style="margin: 0; font-size: 0.9rem; color: #7f8c8d; font-weight: 500;">OP: ${tarea.op}</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 12px 0;">
        
        <p class="desc" style="font-size: 0.95rem; line-height: 1.4;">
            <strong>Descripción:</strong><br>
            ${tarea.descripcion}
        </p>

        <div class="asignados-box" style="background: #fdfdfd; padding: 10px; border-radius: 6px; border: 1px solid #f0f0f0;">
            <strong style="font-size: 0.85rem; color: #555;">Especialistas asignados:</strong><br>
            <div style="margin-top: 5px;">${listaAsignadosHTML}</div>
        </div>

        <div class="card-actions" style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn-asignar" style="grid-column: 1 / -1;" onclick="prepararAsignacion('${idTarea}')">+ Asignar Personal</button>
            <button class="btn-finalizar" onclick="finalizarTarea('${idTarea}')">Finalizar</button>
            <button class="btn-eliminar" style="background-color: #e74c3c;" onclick="eliminarTarea('${idTarea}')">Eliminar</button>
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
    Swal.fire({
        title: '¿Finalizar esta tarea?',
        text: "La OT se moverá al historial y los especialistas quedarán disponibles.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#27ae60', // Verde ENAER
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Sí, finalizar OT',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. Obtener los datos actuales de la tarea
            db.ref('tareas/' + id).once('value', (snapshot) => {
                const datosTarea = snapshot.val();
                
                if (!datosTarea) return;

                // 2. Enviar al historial con la fecha de cierre
                db.ref('historial').push({
                    ...datosTarea,
                    fechaCierre: Date.now(),
                    estado: "Finalizado"
                }).then(() => {
                    // 3. Si hay personal asignado, liberarlos a todos
                    if (datosTarea.asignados) {
                        Object.values(datosTarea.asignados).forEach(asig => {
                            db.ref('especialistas/' + asig.idEspecialista).update({ 
                                estado: "Disponible" 
                            });
                        });
                    }

                    // 4. Eliminar de la lista de tareas activas
                    db.ref('tareas/' + id).remove().then(() => {
                        Swal.fire({
                            title: 'OT Finalizada',
                            text: 'El registro se movió al historial correctamente.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    });
                }).catch(error => {
                    console.error("Error al finalizar:", error);
                    Swal.fire('Error', 'No se pudo cerrar la tarea en la base de datos', 'error');
                });
            });
        }
    });
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
        
        // Cargar tareas activas
        if (snapshots[0].exists()) {
            snapshots[0].forEach(c => { 
                todas.push({ id: c.key, ...c.val(), tipo: 'activas' }); 
            });
        }
        
        // Cargar historial de cerradas
        if (snapshots[1].exists()) {
            snapshots[1].forEach(c => { 
                todas.push({ id: c.key, ...c.val(), tipo: 'cerradas' }); 
            });
        }

        // Aplicar filtro de pestaña
        const filtradas = filtro === 'todas' ? todas : todas.filter(t => t.tipo === filtro);
        
        // Ordenar por fecha (las más recientes primero)
        filtradas.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));

        contenedor.innerHTML = "";

        if (filtradas.length === 0) {
            contenedor.innerHTML = "<p>No hay registros para mostrar.</p>";
            return;
        }

        filtradas.forEach(tarea => {
            // Construir lista de especialistas
            let personalList = "";
            if (tarea.asignados) {
                Object.values(tarea.asignados).forEach(a => { 
                    personalList += `<li>${a.nombre}</li>`; 
                });
            } else {
                personalList = "<li>Sin personal asignado</li>";
            }

            // Formatear fechas para trazabilidad técnica
            const fInicio = tarea.fechaCreacion ? new Date(tarea.fechaCreacion).toLocaleString('es-CL') : 'N/A';
            const fFin = tarea.fechaCierre ? new Date(tarea.fechaCierre).toLocaleString('es-CL') : '---';

            contenedor.innerHTML += `
                <div class="tarea-card-historial ${tarea.tipo}" onclick="toggleDetalle('${tarea.id}')">
                    <div class="header-historial">
                        <div style="display: flex; flex-direction: column;">
                            <small class="tag-avion" style="margin-bottom: 5px;">
                                ✈️ ${tarea.modeloAvion || 'S/M'} | MAT: ${tarea.numAvion || 'S/N'}
                            </small>
                            <strong>OT: ${tarea.ot} | OP: ${tarea.op}</strong>
                        </div>
                        <span class="badge-tipo">${tarea.tipo}</span>
                    </div>

                    <div class="fechas-historial" style="margin: 10px 0; font-size: 0.85rem; background: #f9f9f9; padding: 8px; border-radius: 5px; border-left: 3px solid #ddd;">
                        <span>📅 <b>Inicio:</b> ${fInicio}</span><br>
                        <span>🏁 <b>Cierre:</b> ${fFin}</span>
                    </div>

                    <p style="font-size: 0.9rem; color: #333;"><b>Tarea:</b> ${tarea.descripcion}</p>
                    
                    <div id="detalle-${tarea.id}" class="detalle-personal" style="display:none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
                        <strong style="font-size: 0.85rem;">Especialistas involucrados:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px; font-size: 0.85rem;">${personalList}</ul>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <small style="color: #999;">ID: ${tarea.id}</small>
                            <small style="color: var(--azul-medio); font-weight: bold;">Estatus: ${tarea.estado}</small>
                        </div>
                    </div>
                </div>
            `;
        });
    }).catch(error => {
        console.error("Error al cargar historial:", error);
        contenedor.innerHTML = "<p>Error al cargar los datos.</p>";
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




// CARGAR TABLA 
function cargarTablaHH() {
    const cuerpo = document.getElementById('tablaCuerpoHH');
    const inputFecha = document.getElementById('fechaSeleccionada');
    
    // 1. Validar o establecer fecha inicial
    if (!inputFecha.value) {
        const today = new Date().toISOString().split('T')[0];
        inputFecha.value = today;
    }

    const hoyStr = inputFecha.value; 
    
    // 2. Determinar meta según el día (Viernes 3.5, resto 4.5)
    const fechaObjeto = new Date(hoyStr + "T12:00:00");
    const esViernes = fechaObjeto.getDay() === 5;
    const metaReales = esViernes ? 3.5 : 4.5;

    // 3. Traer datos de Firebase
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

            // 4. FILTRO ESTRICTO: Solo el rol "Pintor" genera HH
            const rolNormalizado = esp.rol.toLowerCase();
            if (rolNormalizado !== "pintor") {
                return; // Salta Inspectores, Supervisores, Mecánicos y Logísticos
            }

            // 5. Buscar TODAS las tareas donde esté asignado el especialista
            let tareasDelEspecialista = [];
            Object.values(tareasActivas).forEach(tarea => {
                if (tarea.asignados) {
                    Object.values(tarea.asignados).forEach(asig => {
                        if (asig.idEspecialista === id) {
                            tareasDelEspecialista.push({
                                ot: tarea.ot,
                                op: tarea.op,
                                matricula: tarea.numAvion
                            });
                        }
                    });
                }
            });

            // 6. Generar el HTML de las filas de OT (Automático o Vacío)
            let htmlFilasOT = "";
            if (tareasDelEspecialista.length > 0) {
                tareasDelEspecialista.forEach((t, index) => {
                    // Ponemos la meta en la primera OT encontrada, 0 en las demás
                    const valorHora = (index === 0) ? metaReales : 0;
                    htmlFilasOT += `
                        <div class="row-ot-input">
                            <span class="label-matricula">✈️ ${t.matricula}</span>
                            <input type="text" placeholder="OT" class="ot-val" value="${t.ot}">
                            <input type="text" placeholder="OP" class="op-val" value="${t.op}">
                            <input type="number" step="0.1" class="hrs-val" value="${valorHora}" oninput="sumarSoloReales('${id}', ${metaReales})">
                        </div>`;
                });
            } else {
                // Fila vacía para especialistas sin asignación previa (posible PNP)
                htmlFilasOT = `
                    <div class="row-ot-input">
                        <span class="label-matricula"></span>
                        <input type="text" placeholder="OT" class="ot-val" value="">
                        <input type="text" placeholder="OP" class="op-val" value="">
                        <input type="number" step="0.1" class="hrs-val" value="0" oninput="sumarSoloReales('${id}', ${metaReales})">
                    </div>`;
            }

            // 7. Insertar la fila del especialista en la tabla
            cuerpo.innerHTML += `
                <tr id="row-hh-${id}">
                    <td class="col-nombre-tecnico">
                        <strong>${esp.nombre}</strong><br>
                        <small style="color: #666;">${esp.rol}</small><br>
                        <button class="btn-add-ot" onclick="agregarFilaOT('${id}', ${metaReales})">+ OT/OP</button>
                    </td>
                    <td id="container-reales-${id}">
                        ${htmlFilasOT}
                    </td>
                    <td id="total-reales-${id}" class="total-reales-cell ${tareasDelEspecialista.length > 0 ? 'meta-ok' : 'meta-pendiente'}">
                        ${tareasDelEspecialista.length > 0 ? metaReales.toFixed(1) : '0.0'}
                    </td>
                    <td><button class="btn-mini-save" onclick="guardarFilaUnica('${id}')">💾</button></td>
                </tr>`;

            // 8. Verificar si ya existe registro guardado para esta fecha seleccionada
            db.ref(`asistencia_hh/${hoyStr}/${id}`).once('value', (savedSnap) => {
                if (savedSnap.exists() && savedSnap.val().finalizado) {
                    bloquearFila(id);
                } else {
                    desbloquearFila(id);
                }
            });
        });
    }).catch(err => {
        console.error("Error cargando HH:", err);
        cuerpo.innerHTML = "<tr><td colspan='4'>Error al conectar con la base de datos.</td></tr>";
    });
}


function aplicarFiltrosDashboard() {
    const textoMatricula = document.getElementById('filtroMatricula').value.toLowerCase();
    const modeloSeleccionado = document.getElementById('filtroModelo').value.toLowerCase();
    const tarjetas = document.querySelectorAll('.tarea-card');

    tarjetas.forEach(tarjeta => {
        // Obtenemos el texto de la matrícula y el modelo de dentro de la tarjeta
        // Asumiendo que usamos la estructura: ✈️ MODELO | Matrícula: NUMERO
        const contenido = tarjeta.innerText.toLowerCase();
        
        const coincideMatricula = contenido.includes(textoMatricula);
        const coincideModelo = modeloSeleccionado === "" || contenido.includes(modeloSeleccionado);

        if (coincideMatricula && coincideModelo) {
            tarjeta.style.display = "block";
        } else {
            tarjeta.style.display = "none";
        }
    });
}

function limpiarFiltros() {
    document.getElementById('filtroMatricula').value = "";
    document.getElementById('filtroModelo').value = "";
    aplicarFiltrosDashboard();
}

function sumarSoloReales(idEsp, meta) {
    let suma = 0;
    document.querySelectorAll(`#container-reales-${idEsp} .hrs-val`).forEach(i => {
        suma += parseFloat(i.value || 0);
    });
    const cell = document.getElementById(`total-reales-${idEsp}`);
    cell.innerText = suma.toFixed(1);
    
    // Cambia el color si llegó a la meta (punto decimal estándar)
    cell.className = (parseFloat(suma.toFixed(1)) === meta) ? "total-reales-cell meta-ok" : "total-reales-cell meta-pendiente";
}

function agregarFilaOT(idEsp, meta) {
    const contenedor = document.getElementById(`container-reales-${idEsp}`);
    const div = document.createElement('div');
    div.className = 'row-ot-input';
    div.innerHTML = `<input type="text" placeholder="OT" class="ot-val"><input type="text" placeholder="OP" class="op-val"><input type="number" step="0.1" class="hrs-val" value="0" oninput="sumarSoloReales('${idEsp}', ${meta})"><button onclick="this.parentElement.remove(); sumarSoloReales('${idEsp}', ${meta})" style="border:none; background:none; color:red; cursor:pointer;">×</button>`;
    contenedor.appendChild(div);
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

async function guardarFilaUnica(idEsp) {
    // 1. Obtener la fecha desde el selector del HTML
    const inputFecha = document.getElementById('fechaSeleccionada');
    const hoyStr = inputFecha.value; 

    if (!hoyStr) {
        Swal.fire('Error', 'Debe seleccionar una fecha para registrar el HH', 'error');
        return;
    }

    // 2. Determinar la meta (4.5 o 3.5) basada en la fecha seleccionada
    // Usamos T12:00:00 para evitar problemas de zona horaria al calcular el día
    const fechaObjeto = new Date(hoyStr + "T12:00:00");
    const esViernes = fechaObjeto.getDay() === 5;
    const meta = esViernes ? 3.5 : 4.5;

    // Capturamos el total de horas de la celda de la tabla
    const totalActual = parseFloat(document.getElementById(`total-reales-${idEsp}`).innerText);
    const nombre = document.querySelector(`#row-hh-${idEsp} strong`).innerText;

    // 1. Alerta Inicial: Confirmar si desea guardar
    const confirmacion = await Swal.fire({
        title: `¿Confirmar Parte Diario?`,
        html: `Especialista: <b>${nombre}</b><br>
               Fecha Labor: <b>${hoyStr}</b><br>
               Total acumulado: <b>${totalActual.toFixed(1)} hrs</b>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1abc9c',
        cancelButtonColor: '#95a5a6',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    // 2. Validación de horas faltantes
    if (totalActual < meta) {
        const faltantes = (meta - totalActual).toFixed(1);
        const pnpConfirm = await Swal.fire({
            title: 'Jornada Incompleta',
            text: `Faltan ${faltantes} hrs para cumplir la meta de ${meta}. ¿Deseas asignar el tiempo restante a PNP (Tiempo no trabajado)?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3498db',
            confirmButtonText: 'Sí, completar con PNP',
            cancelButtonText: 'No, editaré las horas'
        });

        if (pnpConfirm.isConfirmed) {
            const contenedor = document.getElementById(`container-reales-${idEsp}`);
            const div = document.createElement('div');
            div.className = 'row-ot-input';
            div.style.background = "#f9f9f9";
            div.innerHTML = `
                <span class="label-matricula">🛠️ APOYO</span>
                <input type="text" class="ot-val" value="PNP" readonly>
                <input type="text" class="op-val" value="99" readonly>
                <input type="number" class="hrs-val" value="${faltantes}" readonly>
            `;
            contenedor.appendChild(div);
            
            // Recalculamos la suma
            sumarSoloReales(idEsp, meta);
        } else {
            return; 
        }
    }

    // 3. Captura final de datos del desglose (OT, OP, HRS)
    const desglose = [];
    const rows = document.querySelectorAll(`#container-reales-${idEsp} .row-ot-input`);
    
    rows.forEach(row => {
        const ot = row.querySelector('.ot-val').value;
        const op = row.querySelector('.op-val').value;
        const hrs = parseFloat(row.querySelector('.hrs-val').value || 0);
        
        if (ot.trim() !== "" && hrs > 0) {
            desglose.push({ ot, op, hrs });
        }
    });

    // 4. Guardar en Firebase (Usando la fecha del selector hoyStr)
    db.ref(`asistencia_hh/${hoyStr}/${idEsp}`).set({
        nombre: nombre,
        desglose: desglose,
        totalJornada: parseFloat(document.getElementById(`total-reales-${idEsp}`).innerText),
        fechaLabor: hoyStr,
        fechaRegistroFirebase: Date.now(),
        finalizado: true 
    }).then(() => {
        Swal.fire({
            title: '¡Guardado!',
            text: `Parte diario de ${nombre} registrado exitosamente para el día ${hoyStr}.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
        
        bloquearFila(idEsp);
    }).catch(error => {
        console.error("Error al guardar:", error);
        Swal.fire('Error', 'No se pudo conectar con la base de datos', 'error');
    });
}

// Función auxiliar para bloquear la fila visualmente
function bloquearFila(idEsp) {
    const fila = document.getElementById(`row-hh-${idEsp}`);
    if (fila) {
        fila.style.opacity = "0.6";
        fila.style.backgroundColor = "#f2f2f2";
        fila.style.pointerEvents = "none"; 
        
        const btn = fila.querySelector('.btn-mini-save');
        if (btn) {
            btn.innerHTML = "✅";
            btn.disabled = true;
        }
    }
}

// Función para desbloquear (Útil cuando el mecánico cambia de fecha en el selector)
function desbloquearFila(idEsp) {
    const fila = document.getElementById(`row-hh-${idEsp}`);
    if (fila) {
        fila.style.opacity = "1";
        fila.style.backgroundColor = "transparent";
        fila.style.pointerEvents = "auto";
        const btn = fila.querySelector('.btn-mini-save');
        if (btn) {
            btn.innerHTML = "💾";
            btn.disabled = false;
        }
    }
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