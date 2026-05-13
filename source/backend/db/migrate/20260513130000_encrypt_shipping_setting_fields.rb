class EncryptShippingSettingFields < ActiveRecord::Migration[7.2]
  # Rails 7 AR Encryption armazena o payload cifrado in-place — nenhuma coluna
  # _ciphertext é necessária. Esta migration apenas re-salva o registro
  # singleton para que registros com texto puro (criados antes das env vars
  # de encryption estarem configuradas) sejam cifrados.
  #
  # Seguro executar múltiplas vezes: registros já cifrados são re-cifrados
  # com novo IV (não-determinístico) sem perda de dados.

  def up
    # Permite leitura de valores em texto puro durante a transição.
    # Rails 7.2 levantaria Decryption error ao ler plaintext sem este flag.
    ActiveRecord::Encryption.config.support_unencrypted_data = true

    ShippingSetting.find_each do |record|
      record.save!
    rescue ActiveRecord::RecordInvalid => e
      warn "[EncryptShippingSettingFields] Falha ao cifrar registro ##{record.id}: #{e.message}"
      raise
    end
  ensure
    ActiveRecord::Encryption.config.support_unencrypted_data = false
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "Descriptografar os campos exigiria acesso às chaves e sobrescrita — faça isso manualmente."
  end
end
