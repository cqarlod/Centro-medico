const socket = io();

// Función que usará la recepcionista
function enviarAvisoAlDoctor(nombrePaciente, idDoctor, idRecep) {
    socket.emit('notificar-paciente', {
        paciente: nombrePaciente,
        doctorId: idDoctor,
        recepcionistaId: idRecep
    });
}

// Función que usará el doctor
function responderAlPaso(nombrePaciente, idRecep) {
    socket.emit('autorizar-paso', {
        paciente: nombrePaciente,
        recepcionistaId: idRecep
    });
}