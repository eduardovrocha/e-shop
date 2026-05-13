module ImageSerializable
  extend ActiveSupport::Concern

  private

  def serialize_images(product)
    product.ordered_images.map { |blob| blob_to_hash(blob) }
  end

  def blob_to_hash(blob)
    {
      id:           blob.id,
      filename:     blob.filename.to_s,
      content_type: blob.content_type,
      byte_size:    blob.byte_size,
      url:          rails_blob_url(blob, blob_url_opts),
      thumb_url:    rails_representation_url(blob.variant(resize_to_limit: [ 400, 400 ]), blob_url_opts)
    }
  end

  def image_urls(product)
    product.ordered_images.map { |blob| rails_blob_url(blob, blob_url_opts) }
  end

  def blob_url_opts
    host_url = ENV.fetch("HOST_URL", "http://localhost")
    parts    = host_url.sub(%r{\Ahttps?://}, "").split(":")
    {
      host:     parts[0],
      port:     parts[1]&.to_i.presence,
      protocol: host_url.start_with?("https") ? "https" : "http"
    }
  end
end
