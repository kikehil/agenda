Feature: Control de Tiempos
  Como moderador del evento OXXO
  Quiero controlar el inicio y pausa de los temas
  Para que la agenda se cumpla con precisión

  Scenario: El moderador inicia un tema y el cronómetro se sincroniza
    Given que la agenda está cargada
    When el moderador inicia el tema "Bienvenida"
    Then el cronómetro debe empezar a contar desde 5 minutos
    And todos los usuarios deben recibir el evento "sync"

  Scenario: El moderador pausa la sesión y el tiempo se congela
    Given que un tema está en curso
    When el moderador activa la pausa
    Then el tiempo restante debe guardarse en Redis
    And el estado "isPaused" debe ser verdadero

Feature: Identificación de Orador
  Scenario: Usuario "Juan" se loguea y el sistema detecta que es su turno
    Given que el tema actual es "Bienvenida" con expositor "Juan"
    When el usuario "Juan" se conecta al sistema
    Then el sistema debe emitir el rol "MODO_ORADOR" para ese usuario
