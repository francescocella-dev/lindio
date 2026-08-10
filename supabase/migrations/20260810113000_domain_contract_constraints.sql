-- M2: align mutable lead workflow fields with the application domain contract.
-- Service type intentionally remains free text because micro-businesses need custom services.

update public.leads
set next_action = 'Rispondere al cliente'
where btrim(next_action) = '';

alter table public.leads
  alter column next_action set default 'Rispondere al cliente';

alter table public.leads
  add constraint leads_next_action_allowed check (
    next_action in (
      'Rispondere al cliente',
      'Chiamare cliente',
      'Chiedere informazioni mancanti',
      'Fissare sopralluogo',
      'Preparare preventivo',
      'Inviare preventivo',
      'Fare follow-up',
      'Attendere riscontro',
      'Nessuna azione'
    )
  );
